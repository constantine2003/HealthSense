/**
 * HealthSense Local SQLite Database
 *
 * Mirrors the Supabase `profiles` and `health_checkups` tables locally so the
 * kiosk can operate fully offline.  A `sync_queue` table holds records that
 * were created while offline and need to be pushed to Supabase later.
 *
 * All functions are synchronous (better-sqlite3 API).
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, 'healthsense-local.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id                TEXT PRIMARY KEY,
    first_name        TEXT,
    middle_name       TEXT,
    last_name         TEXT,
    username          TEXT UNIQUE,
    recovery_email    TEXT,
    birthday          TEXT,
    sex               TEXT,
    fingerprint_id    INTEGER,
    created_at        TEXT,
    password_hash     TEXT,
    offline_created   INTEGER DEFAULT 0,
    synced            INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS health_checkups (
    id              TEXT PRIMARY KEY,
    user_id         TEXT,
    temperature     REAL,
    spo2            REAL,
    heart_rate      REAL,
    height          REAL,
    weight          REAL,
    bmi             REAL,
    blood_pressure  TEXT,
    created_at      TEXT,
    synced          INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    operation   TEXT NOT NULL,
    table_name  TEXT NOT NULL,
    payload     TEXT NOT NULL,
    local_id    TEXT,
    created_at  TEXT NOT NULL,
    synced      INTEGER DEFAULT 0,
    error       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_profiles_username     ON profiles(username);
  CREATE INDEX IF NOT EXISTS idx_profiles_fingerprint  ON profiles(fingerprint_id);
  CREATE INDEX IF NOT EXISTS idx_checkups_user_id      ON health_checkups(user_id);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced   ON sync_queue(synced) WHERE synced = 0;
`);

// ─── Profiles ─────────────────────────────────────────────────────────────────

export function getProfileByUsername(username) {
  return db.prepare('SELECT * FROM profiles WHERE username = ?').get(username.toLowerCase().trim());
}

export function getProfileByFingerprint(slot) {
  return db.prepare('SELECT * FROM profiles WHERE fingerprint_id = ?').get(slot);
}

export function getProfileById(id) {
  return db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
}

/**
 * Insert or replace a profile row.  Safe to call for both new records and
 * updates (e.g. when pulling from Supabase to refresh the local mirror).
 */
export function upsertProfile(profile) {
  db.prepare(`
    INSERT INTO profiles
      (id, first_name, middle_name, last_name, username, recovery_email,
       birthday, sex, fingerprint_id, created_at, password_hash,
       offline_created, synced)
    VALUES
      (@id, @first_name, @middle_name, @last_name, @username, @recovery_email,
       @birthday, @sex, @fingerprint_id, @created_at, @password_hash,
       @offline_created, @synced)
    ON CONFLICT(id) DO UPDATE SET
      first_name       = excluded.first_name,
      middle_name      = excluded.middle_name,
      last_name        = excluded.last_name,
      username         = excluded.username,
      recovery_email   = excluded.recovery_email,
      birthday         = excluded.birthday,
      sex              = excluded.sex,
      fingerprint_id   = excluded.fingerprint_id,
      password_hash    = COALESCE(excluded.password_hash, password_hash),
      synced           = excluded.synced
  `).run({
    id:              profile.id,
    first_name:      profile.first_name      ?? null,
    middle_name:     profile.middle_name     ?? null,
    last_name:       profile.last_name       ?? null,
    username:        profile.username        ?? null,
    recovery_email:  profile.recovery_email  ?? null,
    birthday:        profile.birthday        ?? null,
    sex:             profile.sex             ?? null,
    fingerprint_id:  profile.fingerprint_id  ?? null,
    created_at:      profile.created_at      ?? new Date().toISOString(),
    password_hash:   profile.password_hash   ?? null,
    offline_created: profile.offline_created ?? 0,
    synced:          profile.synced          ?? 1,
  });
}

/** Update just the password_hash for an existing profile (called on online login). */
export function updatePasswordHash(id, hash) {
  db.prepare('UPDATE profiles SET password_hash = ? WHERE id = ?').run(hash, id);
}

/** After sync: replace a temp offline UUID with the real Supabase UUID. */
export function replaceProfileId(localId, realId) {
  const trx = db.transaction(() => {
    db.prepare('UPDATE profiles SET id = ?, synced = 1, offline_created = 0 WHERE id = ?').run(realId, localId);
    db.prepare('UPDATE health_checkups SET user_id = ? WHERE user_id = ?').run(realId, localId);
  });
  trx();
}

// ─── Health Checkups ──────────────────────────────────────────────────────────

export function getCheckupsByUserId(userId) {
  return db.prepare(
    'SELECT * FROM health_checkups WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}

export function insertCheckup(checkup) {
  db.prepare(`
    INSERT OR IGNORE INTO health_checkups
      (id, user_id, temperature, spo2, heart_rate, height, weight,
       bmi, blood_pressure, created_at, synced)
    VALUES
      (@id, @user_id, @temperature, @spo2, @heart_rate, @height, @weight,
       @bmi, @blood_pressure, @created_at, @synced)
  `).run({
    id:             checkup.id             ?? crypto.randomUUID(),
    user_id:        checkup.user_id,
    temperature:    checkup.temperature    ?? null,
    spo2:           checkup.spo2           ?? null,
    heart_rate:     checkup.heart_rate     ?? null,
    height:         checkup.height         ?? null,
    weight:         checkup.weight         ?? null,
    bmi:            checkup.bmi            ?? null,
    blood_pressure: checkup.blood_pressure ?? null,
    created_at:     checkup.created_at     ?? new Date().toISOString(),
    synced:         checkup.synced         ?? 1,
  });
}

export function markCheckupSynced(id) {
  db.prepare('UPDATE health_checkups SET synced = 1 WHERE id = ?').run(id);
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export function queueSync(operation, tableName, payload, localId = null) {
  db.prepare(`
    INSERT INTO sync_queue (operation, table_name, payload, local_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(operation, tableName, JSON.stringify(payload), localId, new Date().toISOString());
}

export function getPendingSyncItems() {
  return db.prepare('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC').all();
}

export function markSyncItemDone(id) {
  db.prepare('UPDATE sync_queue SET synced = 1, error = NULL WHERE id = ?').run(id);
}

export function markSyncItemError(id, message) {
  db.prepare('UPDATE sync_queue SET error = ? WHERE id = ?').run(message, id);
}

// ─── Bulk pull (used by sync engine to refresh local mirror) ─────────────────

export function upsertCheckupFromCloud(checkup) {
  insertCheckup({ ...checkup, synced: 1 });
}

export default db;
