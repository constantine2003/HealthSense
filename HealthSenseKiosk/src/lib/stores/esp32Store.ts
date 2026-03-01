/**
 * esp32Store.ts
 *
 * Manages the WebSocket connection to the HealthSense serial bridge and
 * exposes reactive stores that the Svelte UI can subscribe to.
 *
 * Connection flow:
 *   checkup.svelte calls esp32.connect() when a measurement phase starts.
 *   The store keeps the WS alive for the whole session and auto-reconnects.
 *
 * Message protocol (bridge → webapp):
 *   { type: 'bridge',    event: 'esp32Connected' | 'esp32Disconnected' }
 *   { type: 'progress',  sensor: SensorKey, progress: number }   // 0-100
 *   { type: 'reading',   sensor: SensorKey, value: number | string }
 *   { type: 'error',     sensor: SensorKey, message: string }
 *   { type: 'pong',      esp32Connected: boolean }
 *
 * Commands (webapp → bridge → ESP32):
 *   { command: 'start',  sensor: SensorKey }
 *   { command: 'cancel' }
 */

import { writable, derived, get } from 'svelte/store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SensorKey = 'weight' | 'height' | 'temp' | 'spo2' | 'bp' | 'fingerprint';

export type SensorState = 'unknown' | 'connected' | 'disconnected' | 'error';
export type SensorStatusMap = Record<SensorKey, SensorState>;

const DEFAULT_SENSOR_STATUS: SensorStatusMap = {
  weight:      'unknown',
  height:      'unknown',
  temp:        'unknown',
  spo2:        'unknown',
  bp:          'unknown',
  fingerprint: 'unknown',
};

export type BridgeStatus =
  | 'disconnected'   // WS not open
  | 'connecting'     // WS handshake in progress
  | 'connected'      // WS open, ESP32 status unknown yet
  | 'esp32Ready'     // WS open + ESP32 connected
  | 'esp32Missing';  // WS open but ESP32 serial not connected

export interface SensorReading {
  sensor: SensorKey;
  value: number | string;
  timestamp: number;
}

// Events emitted by fingerprint operations (enroll + verify)
export interface FingerprintEvent {
  type: 'fp_progress' | 'fp_enrolled' | 'fp_match' | 'fp_noMatch' | 'fp_error';
  step?: string;        // 'place_finger' | 'lift_finger' | 'place_again'
  message?: string;
  slot?: number;        // template slot (1-127)
  confidence?: number;  // 0-100 confidence score from FINGERPRINT_OK search
}

export interface BridgeMessage {
  type: string;
  [key: string]: unknown;
}

// ─── Config (from Vite env) ───────────────────────────────────────────────────

const BRIDGE_URL = import.meta.env.VITE_HS_BRIDGE_URL as string;
const AUTH_TOKEN  = import.meta.env.VITE_HS_TOKEN      as string;

const RECONNECT_DELAY_MS = 3000;
const PING_INTERVAL_MS   = 10_000;

// ─── Stores ───────────────────────────────────────────────────────────────────

/** Current bridge + ESP32 connection status */
export const bridgeStatus = writable<BridgeStatus>('disconnected');

/** Latest reading per sensor (null if not yet received this session) */
export const latestReading = writable<SensorReading | null>(null);

/** Measurement progress for the currently active sensor (0-100) */
export const measureProgress = writable<number>(0);

/** Last error message from the bridge/ESP32 */
export const lastError = writable<string | null>(null);

/** Fingerprint operation events (enroll steps, match result, no-match) */
export const fingerprintEvent = writable<FingerprintEvent | null>(null);

/** True when the webapp can issue sensor commands */
export const isReady = derived(bridgeStatus, ($s) => $s === 'esp32Ready');

/**
 * Per-sensor connection state reported by the ESP32.
 * Updated via { type: 'sensorStatus', sensors: { weight: bool, … } }
 * Also updated reactively on individual readings/errors.
 */
export const sensorStatus = writable<SensorStatusMap>({ ...DEFAULT_SENSOR_STATUS });

// ─── Internal state ───────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer:      ReturnType<typeof setInterval> | null = null;
let intentionalClose = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearTimers() {
  if (reconnectTimer) { clearTimeout(reconnectTimer);   reconnectTimer = null; }
  if (pingTimer)      { clearInterval(pingTimer);       pingTimer      = null; }
}

function scheduleReconnect() {
  if (intentionalClose) return;
  clearTimers();
  reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
}

function startPing() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    send({ type: 'ping' });
  }, PING_INTERVAL_MS);
}

// ─── WebSocket management ─────────────────────────────────────────────────────

export function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return; // Already open or opening
  }

  intentionalClose = false;
  bridgeStatus.set('connecting');

  // Append auth token as a query param (Svelte/browser cannot set custom headers
  // on the native WebSocket constructor).
  const url = `${BRIDGE_URL}?token=${encodeURIComponent(AUTH_TOKEN)}`;

  try {
    ws = new WebSocket(url);
  } catch (e) {
    bridgeStatus.set('disconnected');
    scheduleReconnect();
    return;
  }

  ws.addEventListener('open', () => {
    bridgeStatus.set('connected');
    startPing();
  });

  ws.addEventListener('message', (event) => {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(event.data as string) as BridgeMessage;
    } catch {
      return;
    }
    handleMessage(msg);
  });

  ws.addEventListener('close', () => {
    clearTimers();
    bridgeStatus.set('disconnected');
    scheduleReconnect();
  });

  ws.addEventListener('error', () => {
    // 'close' always fires after 'error', so reconnect logic lives there.
    bridgeStatus.set('disconnected');
  });
}

export function disconnect(): void {
  intentionalClose = true;
  clearTimers();
  if (ws) {
    ws.close();
    ws = null;
  }
  bridgeStatus.set('disconnected');
}

// ─── Message handler ──────────────────────────────────────────────────────────

function handleMessage(msg: BridgeMessage): void {
  switch (msg.type) {
    case 'bridge': {
      const event = msg.event as string;
      if (event === 'esp32Connected') {
        bridgeStatus.set('esp32Ready');
        lastError.set(null);
      } else if (event === 'esp32Disconnected') {
        bridgeStatus.set('esp32Missing');
        // Mark all sensors as unknown when the ESP32 drops off
        sensorStatus.set({ ...DEFAULT_SENSOR_STATUS });
      }
      break;
    }

    case 'pong': {
      bridgeStatus.set(msg.esp32Connected ? 'esp32Ready' : 'esp32Missing');
      break;
    }

    case 'progress': {
      measureProgress.set(msg.progress as number);
      break;
    }

    case 'sensorStatus': {
      // ESP32 reports which physical sensors are wired & responding.
      // Payload: { sensors: { weight: bool, height: bool, temp: bool, spo2: bool, bp: bool } }
      const raw = msg.sensors as Record<string, boolean>;
      if (raw && typeof raw === 'object') {
        sensorStatus.update((cur) => {
          const next = { ...cur };
          for (const key of Object.keys(DEFAULT_SENSOR_STATUS) as SensorKey[]) {
            if (key in raw) next[key] = raw[key] ? 'connected' : 'disconnected';
          }
          return next;
        });
      }
      break;
    }

    case 'reading': {
      measureProgress.set(100);
      const readSensor = msg.sensor as SensorKey;
      latestReading.set({
        sensor:    readSensor,
        value:     msg.value as number | string,
        timestamp: Date.now(),
      });
      // A successful reading confirms that sensor is alive
      sensorStatus.update((cur) => ({ ...cur, [readSensor]: 'connected' }));
      break;
    }

    case 'error': {
      lastError.set(msg.message as string);
      measureProgress.set(0);
      // Mark the offending sensor as errored
      if (msg.sensor) {
        const errSensor = msg.sensor as SensorKey;
        sensorStatus.update((cur) => ({ ...cur, [errSensor]: 'error' }));
        // Propagate fingerprint errors through the fingerprint event channel too
        if (errSensor === 'fingerprint') {
          fingerprintEvent.set({ type: 'fp_error', message: msg.message as string });
        }
      }
      break;
    }

    case 'fp_progress': {
      fingerprintEvent.set({
        type:    'fp_progress',
        step:    msg.step    as string,
        message: msg.message as string,
      });
      break;
    }

    case 'fp_enrolled': {
      fingerprintEvent.set({ type: 'fp_enrolled', slot: msg.slot as number });
      // A successful enroll proves the sensor is alive
      sensorStatus.update((cur) => ({ ...cur, fingerprint: 'connected' }));
      break;
    }

    case 'fp_match': {
      fingerprintEvent.set({
        type:       'fp_match',
        slot:       msg.slot       as number,
        confidence: msg.confidence as number,
      });
      sensorStatus.update((cur) => ({ ...cur, fingerprint: 'connected' }));
      break;
    }

    case 'fp_noMatch': {
      fingerprintEvent.set({ type: 'fp_noMatch' });
      break;
    }

    default:
      break;
  }
}

// ─── Fingerprint API ──────────────────────────────────────────────────────────────

/**
 * Tell the ESP32 to start fingerprint enrollment into the given slot (1-127).
 * The webapp must call this AFTER determining the next free slot from the DB.
 */
export function startFingerprintEnroll(slot: number): boolean {
  fingerprintEvent.set(null);
  lastError.set(null);
  return send({ command: 'fp_enroll', slot });
}

/**
 * Tell the ESP32 to scan for a fingerprint and search its stored templates.
 * Listen to `fingerprintEvent` for `fp_match` / `fp_noMatch` results.
 */
export function startFingerprintVerify(): boolean {
  fingerprintEvent.set(null);
  lastError.set(null);
  return send({ command: 'fp_verify' });
}

/** Cancel any in-progress fingerprint operation on the ESP32. */
export function cancelFingerprint(): boolean {
  return send({ command: 'fp_cancel' });
}

// ─── Command API ──────────────────────────────────────────────────────────────

/** Send a raw JSON object to the bridge (which may relay it to the ESP32). */
export function send(payload: object): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(payload));
  return true;
}

/**
 * Tell the ESP32 to start measuring a specific sensor.
 * Returns false if the bridge is not connected.
 */
export function startMeasurement(sensor: SensorKey): boolean {
  measureProgress.set(0);
  latestReading.set(null);
  lastError.set(null);
  return send({ command: 'start', sensor });
}

/** Cancel the current measurement. */
export function cancelMeasurement(): boolean {
  return send({ command: 'cancel' });
}
