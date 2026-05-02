/**
 * Connectivity store — tracks whether the kiosk has internet access.
 *
 * Two-layer check:
 *   1. `navigator.onLine` (instant, browser-native)
 *   2. GET /api/connectivity on the local bridge server every 10 s
 *      (the bridge does an actual HTTP ping to Supabase from the Pi)
 *
 * Components can subscribe to `isOnline` to reactively show/hide the
 * offline banner or switch the DB client into offline mode.
 */

import { writable, readable, get } from 'svelte/store';

// Base URL of the local serial-bridge HTTP server.
export const BRIDGE_BASE = 'http://127.0.0.1:8089';

// Auth token for bridge API calls (must match HS_TOKEN in serial-bridge/.env).
// Injected by Vite at build time from the root .env file.
const BRIDGE_TOKEN = import.meta.env.VITE_HS_TOKEN ?? '';

export const isOnline = writable(navigator.onLine);

// ─── Browser online/offline events (near-instant) ─────────────────────────────
window.addEventListener('online',  () => isOnline.set(true));
window.addEventListener('offline', () => isOnline.set(false));

// ─── Periodic server-side connectivity probe ──────────────────────────────────
async function probeConnectivity() {
  try {
    const res = await fetch(`${BRIDGE_BASE}/api/connectivity`, {
      headers: { 'x-hs-token': BRIDGE_TOKEN },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const { online } = await res.json();
      isOnline.set(online);
    }
  } catch {
    // If the bridge itself isn't reachable yet, fall back to navigator.onLine.
    isOnline.set(navigator.onLine);
  }
}

// Probe immediately and then every 10 seconds.
probeConnectivity();
const _interval = setInterval(probeConnectivity, 10_000);
