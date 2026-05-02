/**
 * Unified database client for HealthSense Kiosk.
 *
 * Routes all DB operations through either Supabase (online) or the local
 * bridge HTTP API (offline).  When online, writes also mirror to the local DB
 * via the bridge so the 1:1 copy stays fresh.
 *
 * Exported functions map 1:1 with what the Svelte pages need.
 */

import { get } from 'svelte/store';
import { supabase } from '../pages/supabaseClient';
import { isOnline, BRIDGE_BASE } from '../stores/connectivity';

const TOKEN = import.meta.env.VITE_HS_TOKEN ?? '';

// ─── Bridge fetch helper ───────────────────────────────────────────────────────

async function bridgeFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BRIDGE_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-hs-token': TOKEN,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Bridge API error ${res.status}`);
  }
  return res.json();
}

// ─── Login ─────────────────────────────────────────────────────────────────────

/**
 * Log in with username + password.
 * Online:  Supabase auth → fetch full profile → mirror profile locally.
 * Offline: bridge POST /api/auth/login (bcrypt verify against local hash).
 */
export async function login(username: string, password: string): Promise<any> {
  if (get(isOnline)) {
    const userInput = username.toLowerCase().trim();

    // Resolve the auth email (same logic as before).
    const { data: profileLookup } = await supabase
      .from('profiles')
      .select('recovery_email, username')
      .eq('username', userInput)
      .maybeSingle();

    const authEmail = profileLookup?.recovery_email
      ? profileLookup.recovery_email
      : `${profileLookup?.username ?? userInput}@kiosk.local`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });
    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user!.id)
      .single();
    if (profileError) throw profileError;

    // Mirror to local DB (fire-and-forget; include password hash for offline use).
    bridgeFetch('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ ...profile, _password: password }),
    }).catch(() => {});

    return profile;
  } else {
    // Offline path — bridge verifies bcrypt hash locally.
    const profile = await bridgeFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.toLowerCase().trim(), password }),
    });
    return profile;
  }
}

// ─── Fingerprint login ─────────────────────────────────────────────────────────

/**
 * Look up a profile by fingerprint slot.
 * Works the same online and offline — always queries local DB via bridge for
 * speed; if online we also try Supabase as fallback (new user not yet mirrored).
 */
export async function loginByFingerprint(slot: number): Promise<any> {
  // Try local DB first (fast, works offline).
  try {
    const profile = await bridgeFetch(`/api/profiles?fingerprint_id=${slot}`);
    if (profile) return profile;
  } catch {
    // Bridge not responding — fall through to Supabase.
  }

  if (!get(isOnline)) {
    throw new Error('No account linked to this fingerprint (offline)');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('fingerprint_id', slot)
    .single();
  if (error || !profile) throw new Error('No account linked to this fingerprint');

  // Mirror locally for future offline use.
  bridgeFetch('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(profile),
  }).catch(() => {});

  return profile;
}

// ─── Create account ────────────────────────────────────────────────────────────

/**
 * Create a new user account.
 * Online:  Supabase auth.signUp → profiles.insert → mirror to local DB.
 * Offline: bridge creates profile with temp UUID + queues cloud sync.
 */
export async function createAccount(payload: {
  firstName: string;
  middleName: string;
  lastName: string;
  sex: string;
  birthday: string;
  recoveryEmail: string;
  fingerprintSlot: number | null;
  password: string;
}): Promise<any> {
  const cleanFirst = payload.firstName.toLowerCase().trim().replace(/\s+/g, '');
  const cleanLast  = payload.lastName.toLowerCase().trim().replace(/\s+/g, '');
  const username   = `${cleanFirst}.${cleanLast}`;
  const hasEmail   = payload.recoveryEmail?.trim().length > 0;
  const authEmail  = hasEmail ? payload.recoveryEmail.trim() : `${username}@kiosk.local`;

  if (get(isOnline)) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: authEmail,
      password: payload.password,
      options: { data: { display_name: payload.firstName, username } },
    });
    if (authError) throw authError;

    const profilePayload = {
      id:              authData.user!.id,
      first_name:      payload.firstName,
      middle_name:     payload.middleName || null,
      last_name:       payload.lastName,
      username,
      recovery_email:  hasEmail ? authEmail : null,
      birthday:        payload.birthday,
      sex:             payload.sex,
      fingerprint_id:  payload.fingerprintSlot,
      created_at:      new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from('profiles').insert(profilePayload);
    if (profileError) throw profileError;

    // Mirror to local DB with password hash.
    bridgeFetch('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ ...profilePayload, _password: payload.password }),
    }).catch(() => {});

    return profilePayload;
  } else {
    // Offline — delegate entirely to bridge (generates temp UUID, queues sync).
    const profile = await bridgeFetch('/api/profiles/create-offline', {
      method: 'POST',
      body: JSON.stringify({
        first_name:     payload.firstName,
        middle_name:    payload.middleName || null,
        last_name:      payload.lastName,
        username,
        recovery_email: hasEmail ? authEmail : null,
        birthday:       payload.birthday,
        sex:            payload.sex,
        fingerprint_id: payload.fingerprintSlot,
        auth_email:     authEmail,
        password:       payload.password,
      }),
    });
    return profile;
  }
}

// ─── Save checkup ──────────────────────────────────────────────────────────────

/**
 * Save a health checkup record.
 * Online:  insert to Supabase + mirror to local DB.
 * Offline: save to local DB with synced=0 (sync engine will push later).
 */
export async function saveCheckup(data: any): Promise<void> {
  const record = {
    ...data,
    id: data.id ?? crypto.randomUUID(),
    created_at: data.created_at ?? new Date().toISOString(),
  };

  if (get(isOnline)) {
    const { error } = await supabase.from('health_checkups').insert([record]);
    if (error) throw error;

    // Mirror to local DB.
    bridgeFetch('/api/checkups', {
      method: 'POST',
      body: JSON.stringify({ ...record, synced: 1 }),
    }).catch(() => {});
  } else {
    // Save locally with synced=0; sync engine will push when online.
    await bridgeFetch('/api/checkups', {
      method: 'POST',
      body: JSON.stringify({ ...record, synced: 0 }),
    });
  }
}

// ─── Get checkups (history) ────────────────────────────────────────────────────

/**
 * Fetch all checkups for a user.
 * Always reads from local DB (kept in sync on every write).
 * Falls back to Supabase if bridge is unreachable.
 */
export async function getCheckups(userId: string): Promise<any[]> {
  try {
    const rows = await bridgeFetch(`/api/checkups?user_id=${encodeURIComponent(userId)}`);
    return rows ?? [];
  } catch {
    if (get(isOnline)) {
      const { data, error } = await supabase
        .from('health_checkups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
    return [];
  }
}

// ─── Sign out ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (get(isOnline)) {
    await supabase.auth.signOut().catch(() => {});
  }
  // Nothing to do locally — no persistent session tokens are stored.
}
