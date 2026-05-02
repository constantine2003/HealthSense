/**
 * HealthSense ESP32 Serial-to-WebSocket Bridge
 *
 * Architecture:
 *   ESP32 --[USB/UART wired]--> Raspberry Pi serial port
 *        --> This Node.js process (serialport) --> WebSocket server (ws)
 *        --> Svelte webapp (checkup.svelte)
 *
 * Security:
 *   - WebSocket server binds to 127.0.0.1 only (no LAN/WAN exposure)
 *   - Every client must supply a matching AUTH_TOKEN in the Upgrade request
 *     header ("x-hs-token") or as a query param (?token=...).
 *   - Auth token is loaded from the HS_TOKEN environment variable or the
 *     AUTH_TOKEN constant below (rotate before production).
 *
 * ESP32 serial protocol (newline-delimited JSON):
 *   Incoming (ESP32 → bridge):
 *     {"type":"status","connected":true}
 *     {"type":"progress","sensor":"weight","progress":50}
 *     {"type":"reading","sensor":"weight","value":72.4}
 *     {"type":"reading","sensor":"bp","value":"120/80"}
 *     {"type":"error","sensor":"weight","message":"Timeout"}
 *
 *   Outgoing (bridge → ESP32):
 *     {"command":"start","sensor":"weight"}
 *     {"command":"cancel"}
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { URL } from 'url';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { createInterface as createReadlineInterface } from 'readline';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import * as localDb from './local-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  // Serial port – overridable via env var.
  // On Raspberry Pi: '/dev/ttyUSB0' or '/dev/ttyACM0'
  // On Windows (dev): 'COM3', 'COM4', etc.
  SERIAL_PORT: process.env.HS_SERIAL_PORT || '/dev/ttyUSB0',
  BAUD_RATE: parseInt(process.env.HS_BAUD_RATE || '115200', 10),

  // WebSocket server
  WS_HOST: '127.0.0.1',          // loopback only – never 0.0.0.0
  WS_PORT: parseInt(process.env.HS_WS_PORT || '8089', 10),

  // Shared secret – change this or set via HS_TOKEN env var.
  // The Svelte app must use the same token.
  AUTH_TOKEN: process.env.HS_TOKEN || 'hs-local-dev-token-change-me',

  // How long (ms) to wait before retrying a failed serial connection
  SERIAL_RETRY_MS: 3000,
};

// ─── BP Camera OCR configuration ─────────────────────────────────────────────

const BP_CONFIG = {
  // Path to the Python OCR script (relative to this file's directory)
  OCR_SCRIPT: process.env.BP_OCR_SCRIPT
    || resolve(__dirname, '../bp-camera/bp_ocr.py'),
  POLL_INTERVAL_MS: 100,    // reschedule almost immediately after each OCR result
  TIMEOUT_MS: 90000,         // give up after 90 s
  // Hard cap on how long a single OCR invocation may run. Camera capture
  // (picamera2) can hang indefinitely if the sensor is misconfigured;
  // this ensures the poll loop always continues regardless.
  PROCESS_TIMEOUT_MS: 90000,  // 90s — accommodates EasyOCR first-run model download (~45MB)
};

// ─── Globals ──────────────────────────────────────────────────────────────────

/** @type {SerialPort | null} */
let serialPort = null;
let serialConnected = false;
let retryTimer = null;

/** Last sensorStatus payload received from the ESP32 – replayed to new WS clients. */
let lastSensorStatus = null;

/** @type {WebSocketServer} */
let wss;

// ─── BP OCR state ─────────────────────────────────────────────────────────────

let bpActive        = false;
let bpPollTimer     = null;
let bpTimeoutTimer  = null;
let bpStartedAt     = 0;
/** @type {import('child_process').ChildProcess | null} */
let bpOcrProcess    = null;

// ─── BP Calibration state ─────────────────────────────────────────────────────

let bpCalibrateActive  = false;
let bpCalibrateTimer   = null;
/** @type {import('child_process').ChildProcess | null} */
let bpCalibrateProcess = null;

const ENV_PATH = resolve(__dirname, '.env');

// ─── Logging helpers ──────────────────────────────────────────────────────────

const ts = () => new Date().toISOString();
const log  = (...a) => console.log (`[${ts()}] [BRIDGE]`, ...a);
const warn = (...a) => console.warn (`[${ts()}] [WARN]  `, ...a);
const err  = (...a) => console.error(`[${ts()}] [ERROR] `, ...a);

// ─── Auth helper ─────────────────────────────────────────────────────────────

/**
 * Returns true when the request carries a valid token.
 * Checks: "x-hs-token" header  OR  ?token= query param.
 */
function isAuthorized(req) {
  const headerToken = req.headers['x-hs-token'];
  if (headerToken && headerToken === CONFIG.AUTH_TOKEN) return true;

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken && queryToken === CONFIG.AUTH_TOKEN) return true;
  } catch (_) { /* invalid URL – deny */ }

  return false;
}

// ─── Broadcast helper ─────────────────────────────────────────────────────────

/**
 * Send a JSON payload to all currently open & authenticated WS clients.
 * @param {object} payload
 */
function broadcast(payload) {
  if (!wss) return;
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// ─── BP OCR helpers ───────────────────────────────────────────────────────────

/** Inject bp=true into a sensorStatus message before broadcasting. */
function injectBpAvailable(msg) {
  if (msg && msg.type === 'sensorStatus' && msg.sensors) {
    msg.sensors.bp = true;
  }
  return msg;
}

function startBpMeasurement() {
  if (bpActive) return;
  bpActive = true;
  bpStartedAt = Date.now();

  log(`BP: starting camera OCR loop (timeout ${BP_CONFIG.TIMEOUT_MS / 1000}s)`);
  broadcast({ type: 'progress', sensor: 'bp', progress: 0 });

  bpTimeoutTimer = setTimeout(() => {
    stopBpMeasurement();
    broadcast({ type: 'error', sensor: 'bp', message: 'BP reading timed out — please try again or enter manually' });
  }, BP_CONFIG.TIMEOUT_MS);

  scheduleBpPoll();
}

function stopBpMeasurement() {
  bpActive = false;
  clearTimeout(bpPollTimer);
  clearTimeout(bpTimeoutTimer);
  bpPollTimer = null;
  bpTimeoutTimer = null;
  if (bpOcrProcess) {
    try { bpOcrProcess.kill(); } catch (_) {}
    bpOcrProcess = null;
  }
}

function scheduleBpPoll() {
  if (!bpActive) return;
  bpPollTimer = setTimeout(runBpOcr, BP_CONFIG.POLL_INTERVAL_MS);
}

function runBpOcr() {
  if (!bpActive) return;

  const emitProgress = () => {
    if (!bpActive) return;
    const elapsed = Date.now() - bpStartedAt;
    const prog = Math.min(90, Math.floor((elapsed / BP_CONFIG.TIMEOUT_MS) * 90));
    broadcast({ type: 'progress', sensor: 'bp', progress: prog });
  };

  emitProgress();

  const proc = spawn('python3', [BP_CONFIG.OCR_SCRIPT]);
  bpOcrProcess = proc;
  let stdout = '';

  // Keep the progress bar moving while the Python process runs its internal loop
  const progressTimer = setInterval(emitProgress, 1500);

  // ── Hard kill timeout — prevents a hanging camera capture from stalling the loop ──
  const killTimer = setTimeout(() => {
    if (bpOcrProcess === proc) {
      warn('BP OCR process timed out — killing and rescheduling');
      clearInterval(progressTimer);
      try { proc.kill(); } catch (_) {}
      bpOcrProcess = null;
      // Broadcast an error frame so the debug panel shows something
      broadcastBpErrorFrame('Camera timeout — process killed after 15 s');
      scheduleBpPoll();
    }
  }, BP_CONFIG.PROCESS_TIMEOUT_MS);

  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => {
    const text = d.toString();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('BPFRAME:')) {
        // Live preview frame emitted by _run_segment_detection — relay to frontend
        try {
          const frameData = JSON.parse(trimmed.slice('BPFRAME:'.length));
          broadcast({
            type:      'bp_frame',
            imageData: frameData.imageData || '',
            capW:      frameData.capW || 0,
            capH:      frameData.capH || 0,
            bands:     { sys: frameData.sys?.toString() ?? '', dia: frameData.dia?.toString() ?? '', pulse: '' },
            validated: { sys: frameData.sys ?? null, dia: frameData.dia ?? null, pulse: null, complete: false },
            error:     null,
          });
        } catch (_) { /* malformed — ignore */ }
      } else {
        warn(`BP OCR stderr: ${trimmed}`);
      }
    }
  });

  proc.on('close', () => {
    clearTimeout(killTimer);
    clearInterval(progressTimer);
    bpOcrProcess = null;
    if (!bpActive) return;

    let result = null;
    try {
      result = JSON.parse(stdout.trim());
    } catch (e) {
      warn(`BP OCR parse error: ${e.message} | stdout="${stdout.trim()}"`);
      broadcastBpErrorFrame(`Parse error: ${stdout.trim().slice(0, 120) || '(no output)'}`);
      scheduleBpPoll();
      return;
    }

    // Always broadcast a debug frame (even when OCR fails — shows error reason in table)
    broadcast({
      type: 'bp_frame',
      imageData: result.debug_image || '',
      bands: {
        sys:   result.raw_sys   ?? '',
        dia:   result.raw_dia   ?? '',
        pulse: result.raw_pulse ?? '',
      },
      validated: {
        sys:      result.sys      ?? null,
        dia:      result.dia      ?? null,
        pulse:    result.pulse    ?? null,
        complete: result.complete ?? false,
      },
      error: result.valid ? null : (result.reason ?? 'Unknown OCR error'),
    });

    if (result.valid) {
      if (result.complete) {
        log(`BP OCR complete: ${result.sys}/${result.dia} (pulse=${result.pulse})`);
        stopBpMeasurement();
        broadcast({ type: 'reading', sensor: 'bp', value: `${result.sys}/${result.dia}` });
        return;
      } else {
        log(`BP OCR preview: sys=${result.sys} dia=${result.dia} (waiting for all rows…)`);
        broadcast({ type: 'bp_preview', sys: result.sys, dia: result.dia });
      }
    } else {
      log(`BP OCR: no valid reading — ${result.reason}`);
    }

    scheduleBpPoll();
  });

  proc.on('error', (e) => {
    clearTimeout(killTimer);
    clearInterval(progressTimer);
    warn(`BP OCR process error: ${e.message}`);
    bpOcrProcess = null;
    broadcastBpErrorFrame(`Process error: ${e.message}`);
    scheduleBpPoll();
  });
}

/** Broadcast a bp_frame with no image but an error message (keeps debug panel alive). */
function broadcastBpErrorFrame(errorMsg) {
  broadcast({
    type: 'bp_frame',
    imageData: '',
    bands:     { sys: '', dia: '', pulse: '' },
    validated: { sys: null, dia: null, pulse: null, complete: false },
    error: errorMsg,
  });
}

// ─── BP Calibration helpers ───────────────────────────────────────────────────

/**
 * Start a persistent streaming calibration process.
 * Spawns ONE Python process with --capture-only --stream which opens picamera2
 * once and outputs one JSON line per frame continuously. Frames are broadcast
 * as bp_frame messages as they arrive (no per-frame process spawn overhead).
 */
function startBpCalibrate() {
  if (bpActive) stopBpMeasurement();
  if (bpCalibrateActive) stopBpCalibrate();   // clean up any stale process
  bpCalibrateActive = true;
  log('BP calibration: starting persistent stream');

  const proc = spawn('python3', [BP_CONFIG.OCR_SCRIPT, '--capture-only', '--stream']);
  bpCalibrateProcess = proc;

  // Kill-switch: if the process hangs for > 60 s with no output, restart it
  let lastFrameAt = Date.now();
  const watchdog = setInterval(() => {
    if (!bpCalibrateActive) { clearInterval(watchdog); return; }
    if (Date.now() - lastFrameAt > 60000) {
      warn('BP calibration stream watchdog: no frame for 60 s — restarting');
      clearInterval(watchdog);
      try { proc.kill(); } catch (_) {}
    }
  }, 10000);

  const rl = createReadlineInterface({ input: proc.stdout, crlfDelay: Infinity });
  rl.on('line', (line) => {
    lastFrameAt = Date.now();
    if (!bpCalibrateActive) return;
    let result = null;
    try { result = JSON.parse(line); } catch (_) { return; }
    broadcast({
      type:      'bp_frame',
      imageData: result.cap_image || '',
      calibrate: true,
      capW:      result.cap_w || 0,
      capH:      result.cap_h || 0,
      segStatus: result.seg_status || null,
      bands:     { sys: '', dia: '', pulse: '' },
      validated: { sys: null, dia: null, pulse: null, complete: false },
      error:     result.error || null,
    });
  });

  proc.stderr.on('data', (d) => { warn(`BP capture stderr: ${d.toString().trim()}`); });

  proc.on('close', () => {
    clearInterval(watchdog);
    bpCalibrateProcess = null;
    // Restart automatically if calibration is still active (e.g. process crashed)
    if (bpCalibrateActive) {
      warn('BP calibration stream exited unexpectedly — restarting in 1 s');
      bpCalibrateTimer = setTimeout(startBpCalibrate, 1000);
    }
  });

  proc.on('error', (e) => {
    clearInterval(watchdog);
    bpCalibrateProcess = null;
    warn(`BP calibration process error: ${e.message}`);
    if (bpCalibrateActive) {
      bpCalibrateTimer = setTimeout(startBpCalibrate, 1000);
    }
  });
}

function stopBpCalibrate() {
  bpCalibrateActive = false;
  clearTimeout(bpCalibrateTimer);
  bpCalibrateTimer = null;
  if (bpCalibrateProcess) {
    try { bpCalibrateProcess.kill(); } catch (_) {}
    bpCalibrateProcess = null;
  }
  log('BP calibration: stopped');
}

/**
 * Update key=value pairs in the .env file and apply them to process.env
 * so the next OCR invocation picks them up without a server restart.
 * @param {Record<string,string|number>} updates
 */
function writeDotEnv(updates) {
  let lines = [];
  try {
    lines = readFileSync(ENV_PATH, 'utf8').split('\n');
  } catch {
    // file doesn't exist yet — start with empty
  }

  for (const [key, value] of Object.entries(updates)) {
    const str = String(value);
    const idx = lines.findIndex((l) => l.startsWith(key + '='));
    if (idx >= 0) {
      lines[idx] = `${key}=${str}`;
    } else {
      lines.push(`${key}=${str}`);
    }
    process.env[key] = str;
  }

  writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
}

// ─── Serial connection ────────────────────────────────────────────────────────

function connectSerial() {
  clearTimeout(retryTimer);

  log(`Opening serial port ${CONFIG.SERIAL_PORT} @ ${CONFIG.BAUD_RATE} baud…`);

  const port = new SerialPort({
    path: CONFIG.SERIAL_PORT,
    baudRate: CONFIG.BAUD_RATE,
    autoOpen: false,
    // Prevent the OS from toggling DTR/RTS when the port opens/closes.
    // Without this, opening the port resets the ESP32 on Windows (CH340/CP210x),
    // which causes an immediate 'close' event and an infinite retry loop.
    hupcl: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.open((openErr) => {
    if (openErr) {
      warn(`Cannot open serial port: ${openErr.message}. Retrying in ${CONFIG.SERIAL_RETRY_MS / 1000}s…`);
      scheduleSerialRetry();
      return;
    }

    serialPort = port;
    serialConnected = true;
    log(`Serial port ${CONFIG.SERIAL_PORT} open.`);
    broadcast({ type: 'bridge', event: 'esp32Connected' });
  });

  // ── Incoming data from ESP32 ──
  parser.on('data', (line) => {
    const raw = line.trim();
    if (!raw) return;

    try {
      const msg = JSON.parse(raw);
      // Cache the latest sensorStatus so we can replay it to new WS clients.
      // Always override bp=true (BP is handled via camera, not ESP32).
      if (msg.type === 'sensorStatus') {
        injectBpAvailable(msg);
        lastSensorStatus = msg;
      }
      // Forward the validated JSON object directly to all WS clients
      broadcast(msg);
    } catch (_) {
      // If ESP32 sends a plain string, wrap it as a log message
      broadcast({ type: 'log', message: raw });
    }
  });

  port.on('error', (e) => {
    err(`Serial port error: ${e.message}`);
    handleSerialClose();
  });

  port.on('close', () => {
    log('Serial port closed.');
    handleSerialClose();
  });
}

function handleSerialClose() {
  if (serialPort && serialPort.isOpen) {
    try { serialPort.close(); } catch (_) {}
  }
  serialPort = null;

  if (serialConnected) {
    serialConnected = false;
    broadcast({ type: 'bridge', event: 'esp32Disconnected' });
    lastSensorStatus = null;  // clear cached status on disconnect
  }

  scheduleSerialRetry();
}

function scheduleSerialRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connectSerial, CONFIG.SERIAL_RETRY_MS);
}

// ─── Send command to ESP32 ────────────────────────────────────────────────────

/** Write a JSON command to the ESP32 over serial. */
function sendToESP32(payload) {
  if (!serialPort || !serialPort.isOpen) {
    warn('Cannot send to ESP32 – serial port not open.');
    return false;
  }
  const line = JSON.stringify(payload) + '\n';
  serialPort.write(line, (writeErr) => {
    if (writeErr) err(`Serial write error: ${writeErr.message}`);
  });
  return true;
}

// ─── HTTP API helpers ─────────────────────────────────────────────────────────

function jsonOk(res, data) {
  const body = JSON.stringify(data);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function jsonErr(res, status, msg) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: msg }));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

// ─── HTTP request router ──────────────────────────────────────────────────────

async function handleHttpRequest(req, res) {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-hs-token',
    });
    return res.end();
  }

  // Auth check — same token as WebSocket.
  if (!isAuthorized(req)) return jsonErr(res, 401, 'Unauthorized');

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = parsedUrl.pathname;
  const qs = parsedUrl.searchParams;

  try {
    // ── GET /api/connectivity ──────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/api/connectivity') {
      const supaUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
      let online = false;
      if (supaUrl) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 4000);
          const r = await fetch(supaUrl, { method: 'HEAD', signal: ctrl.signal });
          clearTimeout(t);
          online = r.status < 500;
        } catch { online = false; }
      }
      return jsonOk(res, { online });
    }

    // ── POST /api/auth/login ───────────────────────────────────────────────────
    if (req.method === 'POST' && path === '/api/auth/login') {
      const { username, password } = await readBody(req);
      if (!username || !password) return jsonErr(res, 400, 'Missing username or password');

      const profile = localDb.getProfileByUsername(username);
      if (!profile) return jsonErr(res, 401, 'No account found for this username');
      if (!profile.password_hash) return jsonErr(res, 401, 'No offline credentials stored for this account — please log in online first');

      const ok = await bcrypt.compare(password, profile.password_hash);
      if (!ok) return jsonErr(res, 401, 'Incorrect password');

      const { password_hash, ...safeProfile } = profile;
      return jsonOk(res, safeProfile);
    }

    // ── GET /api/profiles ──────────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/api/profiles') {
      if (qs.has('username'))       return jsonOk(res, localDb.getProfileByUsername(qs.get('username')) ?? null);
      if (qs.has('fingerprint_id')) return jsonOk(res, localDb.getProfileByFingerprint(Number(qs.get('fingerprint_id'))) ?? null);
      if (qs.has('id'))             return jsonOk(res, localDb.getProfileById(qs.get('id')) ?? null);
      return jsonErr(res, 400, 'Provide username, fingerprint_id, or id query param');
    }

    // ── POST /api/profiles (upsert — called after online login/create) ─────────
    if (req.method === 'POST' && path === '/api/profiles') {
      const body = await readBody(req);
      const { _password, ...profile } = body;
      if (_password) {
        profile.password_hash = await bcrypt.hash(_password, 10);
      }
      profile.offline_created = profile.offline_created ?? 0;
      profile.synced          = profile.synced          ?? 1;
      localDb.upsertProfile(profile);
      return jsonOk(res, { ok: true });
    }

    // ── GET /api/profiles/next-fingerprint-slot ───────────────────────────────
    if (req.method === 'GET' && path === '/api/profiles/next-fingerprint-slot') {
      const row = localDb.default.prepare(
        'SELECT MAX(fingerprint_id) as max_slot FROM profiles WHERE fingerprint_id IS NOT NULL'
      ).get();
      const nextSlot = row?.max_slot != null ? row.max_slot + 1 : 1;
      return jsonOk(res, { slot: nextSlot });
    }

    // ── POST /api/profiles/create-offline ─────────────────────────────────────
    if (req.method === 'POST' && path === '/api/profiles/create-offline') {
      const body = await readBody(req);
      const { password, auth_email, ...profileFields } = body;
      const id = crypto.randomUUID();
      const hash = await bcrypt.hash(password, 10);

      const profile = {
        ...profileFields,
        id,
        created_at:     new Date().toISOString(),
        password_hash:  hash,
        offline_created: 1,
        synced:          0,
      };
      localDb.upsertProfile(profile);

      // Queue the Supabase auth.signUp + profiles.insert for later.
      localDb.queueSync('auth_signup', 'auth.users', {
        email: auth_email,
        password,
        display_name: profileFields.first_name,
        username: profileFields.username,
      }, id);
      localDb.queueSync('profile_insert', 'profiles', profileFields, id);

      const { password_hash, ...safeProfile } = profile;
      return jsonOk(res, safeProfile);
    }

    // ── GET /api/checkups?user_id= ─────────────────────────────────────────────
    if (req.method === 'GET' && path === '/api/checkups') {
      const userId = qs.get('user_id');
      if (!userId) return jsonErr(res, 400, 'Provide user_id query param');
      return jsonOk(res, localDb.getCheckupsByUserId(userId));
    }

    // ── POST /api/checkups ─────────────────────────────────────────────────────
    if (req.method === 'POST' && path === '/api/checkups') {
      const body = await readBody(req);
      const record = { id: crypto.randomUUID(), ...body, created_at: body.created_at ?? new Date().toISOString() };
      localDb.insertCheckup(record);

      if ((record.synced ?? 1) === 0) {
        localDb.queueSync('checkup_insert', 'health_checkups', record, record.id);
      }
      return jsonOk(res, { ok: true, id: record.id });
    }

    return jsonErr(res, 404, 'Not found');
  } catch (e) {
    err(`HTTP API error [${path}]: ${e.message}`);
    return jsonErr(res, 500, e.message);
  }
}

// ─── WebSocket server ─────────────────────────────────────────────────────────

function startWebSocketServer() {
  // Use an underlying http.Server so we can inspect headers before upgrade
  const httpServer = createServer(handleHttpRequest);

  wss = new WebSocketServer({ noServer: true });

  // Upgrade hook – enforce auth before the WS handshake
  httpServer.on('upgrade', (req, socket, head) => {
    if (!isAuthorized(req)) {
      warn(`Rejected WebSocket connection from ${socket.remoteAddress} – bad token`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    const remote = req.socket.remoteAddress;
    log(`WebSocket client connected: ${remote}`);

    // Immediately tell the client the current ESP32 state
    ws.send(JSON.stringify({
      type: 'bridge',
      event: serialConnected ? 'esp32Connected' : 'esp32Disconnected',
    }));

    // Replay last known sensor status so the widget is populated immediately
    if (serialConnected && lastSensorStatus) {
      ws.send(JSON.stringify(lastSensorStatus));
    } else if (serialConnected) {
      // ESP32 is connected but hasn't sent status yet — request it
      sendToESP32({ command: 'status' });
    }

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (_) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      // Webapp → ESP32 command relay
      if (msg.command) {
        // ── BP is handled entirely on the Pi side (camera OCR) ──────────────
        if (msg.command === 'start' && msg.sensor === 'bp') {
          startBpMeasurement();
          return;
        }

        // Calibration commands
        if (msg.command === 'bp_calibrate_start') {
          startBpCalibrate();
          return;
        }
        if (msg.command === 'bp_calibrate_stop') {
          stopBpCalibrate();
          return;
        }

        if (msg.command === 'bp_load_segments') {
          const segConfigPath = resolve(__dirname, '../bp-camera/seg_config.json');
          try {
            const raw = JSON.parse(readFileSync(segConfigPath, 'utf8'));
            ws.send(JSON.stringify({ type: 'bp_segments_loaded', config: raw }));
          } catch (_) {
            ws.send(JSON.stringify({ type: 'bp_segments_loaded', config: null }));
          }
          return;
        }

        if (msg.command === 'bp_save_segments') {
          const segConfigPath = resolve(__dirname, '../bp-camera/seg_config.json');
          const segConfig = {
            digits: msg.digits,
            threshold: msg.threshold ?? 120,
            camera: msg.camera ?? {},
          };
          writeFileSync(segConfigPath, JSON.stringify(segConfig, null, 2));
          // Also persist camera env vars
          if (msg.camera) {
            const cam = msg.camera;
            const camUpdates = {};
            if (cam.brightness !== undefined) camUpdates.BP_BRIGHTNESS = cam.brightness;
            if (cam.contrast   !== undefined) camUpdates.BP_CONTRAST   = cam.contrast;
            if (cam.sharpness  !== undefined) camUpdates.BP_SHARPNESS  = cam.sharpness;
            if (cam.saturation !== undefined) camUpdates.BP_SATURATION = cam.saturation;
            writeDotEnv(camUpdates);
          }
          ws.send(JSON.stringify({ type: 'bp_config_saved' }));
          log(`Segment config saved to ${segConfigPath}`);
          return;
        }

        if (msg.command === 'bp_test_segments') {
          const tmpConfig = resolve(tmpdir(), `seg_test_${Date.now()}.json`);
          const segConfig = {
            digits: msg.digits,
            threshold: msg.threshold ?? 120,
            camera: msg.camera ?? {},
          };
          writeFileSync(tmpConfig, JSON.stringify(segConfig));
          const testProc = spawn('python3', [BP_CONFIG.OCR_SCRIPT, '--test', '--config', tmpConfig]);
          let testOut = '';
          let testErr = '';
          testProc.stdout.on('data', (d) => { testOut += d.toString(); });
          testProc.stderr.on('data', (d) => { testErr += d.toString(); });
          testProc.on('close', () => {
            try {
              const parsed = JSON.parse(testOut.trim());
              ws.send(JSON.stringify({ type: 'bp_test_result', ...parsed }));
              if (parsed.imageData) {
                ws.send(JSON.stringify({ type: 'bp_frame', imageData: parsed.imageData, capW: parsed.capW, capH: parsed.capH }));
              }
            } catch {
              warn(`bp_test_segments parse error: ${testErr.slice(0, 200)}`);
              ws.send(JSON.stringify({ type: 'bp_test_result', error: 'parse error', stderr: testErr.slice(0, 200) }));
            }
            try { unlinkSync(tmpConfig); } catch {}
          });
          return;
        }

        if (msg.command === 'bp_save_config') {
          const updates = {};
          if (msg.sysBox) {
            const { x, y, w, h } = msg.sysBox;
            updates.BP_SYS_X = Math.round(x);
            updates.BP_SYS_Y = Math.round(y);
            updates.BP_SYS_W = Math.round(w);
            updates.BP_SYS_H = Math.round(h);
          }
          if (msg.diaBox) {
            const { x, y, w, h } = msg.diaBox;
            updates.BP_DIA_X = Math.round(x);
            updates.BP_DIA_Y = Math.round(y);
            updates.BP_DIA_W = Math.round(w);
            updates.BP_DIA_H = Math.round(h);
          }
          if (msg.camera) {
            const cam = msg.camera;
            if (cam.brightness !== undefined) updates.BP_BRIGHTNESS = cam.brightness;
            if (cam.contrast   !== undefined) updates.BP_CONTRAST   = cam.contrast;
            if (cam.sharpness  !== undefined) updates.BP_SHARPNESS  = cam.sharpness;
            if (cam.saturation !== undefined) updates.BP_SATURATION = cam.saturation;
          }
          writeDotEnv(updates);
          ws.send(JSON.stringify({ type: 'bp_config_saved' }));
          log(`BP config saved: ${JSON.stringify(updates)}`);
          return;
        }

        // Cancel also stops any active BP OCR loop before forwarding to ESP32
        if ((msg.command === 'cancel' || msg.command === 'fp_cancel') && bpActive) {
          stopBpMeasurement();
        }

        const sent = sendToESP32(msg);
        if (!sent) {
          ws.send(JSON.stringify({
            type: 'bridge',
            event: 'esp32Disconnected',
            message: 'ESP32 not connected – command not sent',
          }));
        }
        return;
      }

      // Webapp requesting bridge status
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', esp32Connected: serialConnected }));
        return;
      }
    });

    ws.on('close', () => log(`WebSocket client disconnected: ${remote}`));
    ws.on('error', (e) => warn(`WebSocket client error (${remote}): ${e.message}`));
  });

  httpServer.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      err(`Port ${CONFIG.WS_PORT} is already in use. Is another bridge instance running? Exiting so the process manager can retry.`);
    } else {
      err(`HTTP server error: ${e.message}`);
    }
    // Exit with code 1 so node --watch / a supervisor can restart cleanly.
    process.exit(1);
  });

  httpServer.listen(CONFIG.WS_PORT, CONFIG.WS_HOST, () => {
    log(`WebSocket server listening on ws://${CONFIG.WS_HOST}:${CONFIG.WS_PORT}`);
    log(`Auth token: ${CONFIG.AUTH_TOKEN.slice(0, 8)}… (${CONFIG.AUTH_TOKEN.length} chars)`);
    log(`Serial port target: ${CONFIG.SERIAL_PORT}`);
  });
}

// ─── Cloud sync engine ────────────────────────────────────────────────────────

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

async function isInternetAvailable() {
  const supaUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  if (!supaUrl) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(supaUrl, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return r.status < 500;
  } catch { return false; }
}

async function syncToCloud() {
  const online = await isInternetAvailable();
  if (!online) return;

  const supa = getSupabaseClient();
  if (!supa) { warn('Sync: SUPABASE_URL / SUPABASE_ANON_KEY not set in .env — skipping'); return; }

  const items = localDb.getPendingSyncItems();
  if (items.length === 0) return;

  log(`Sync: ${items.length} item(s) to push`);

  // Keep a map of localId → realId for auth signups processed this run.
  const idMap = new Map();

  for (const item of items) {
    let payload;
    try { payload = JSON.parse(item.payload); } catch { localDb.markSyncItemError(item.id, 'bad JSON'); continue; }

    try {
      if (item.operation === 'auth_signup' && item.table_name === 'auth.users') {
        const { data, error } = await supa.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: { data: { display_name: payload.display_name, username: payload.username } },
        });
        if (error) throw error;
        const realId = data.user?.id;
        if (realId && item.local_id) {
          idMap.set(item.local_id, realId);
          localDb.replaceProfileId(item.local_id, realId);
          log(`Sync: mapped local UUID ${item.local_id} → Supabase ${realId}`);
        }

      } else if (item.operation === 'profile_insert' && item.table_name === 'profiles') {
        // The profile row may already have its id updated by replaceProfileId above.
        const localId   = item.local_id;
        const realId    = idMap.get(localId) ?? localDb.getProfileById(localId)?.id ?? localId;
        const profile   = localDb.getProfileById(realId);
        if (!profile) throw new Error(`Profile ${realId} not found locally`);

        const { password_hash, offline_created, synced, ...cloudPayload } = profile;
        const { error } = await supa.from('profiles').upsert(cloudPayload);
        if (error) throw error;

      } else if (item.operation === 'checkup_insert' && item.table_name === 'health_checkups') {
        // Remap user_id if it was an offline-created account.
        const remapped = { ...payload };
        if (item.local_id && idMap.has(payload.user_id)) {
          remapped.user_id = idMap.get(payload.user_id);
        }
        const { synced, ...cloudPayload } = remapped;
        const { error } = await supa.from('health_checkups').upsert(cloudPayload);
        if (error) throw error;
        localDb.markCheckupSynced(remapped.id);
      }

      localDb.markSyncItemDone(item.id);
      log(`Sync: item #${item.id} (${item.operation}) pushed OK`);

    } catch (e) {
      localDb.markSyncItemError(item.id, e.message);
      warn(`Sync: item #${item.id} failed — ${e.message}`);
    }
  }
}

// ─── One-time seed from Supabase ──────────────────────────────────────────────

/**
 * Pulls all profiles and health_checkups from Supabase into the local DB.
 * Only runs if the local profiles table is empty (i.e., first ever start).
 * This ensures existing users can log in and view history offline immediately.
 */
async function seedFromCloud() {
  const existing = localDb.default.prepare('SELECT COUNT(*) as n FROM profiles').get();
  if (existing.n > 0) return; // Already seeded — skip.

  const online = await isInternetAvailable();
  if (!online) {
    warn('Seed: no internet — will retry on next sync cycle');
    return;
  }

  const supa = getSupabaseClient();
  if (!supa) { warn('Seed: Supabase credentials missing — skipping'); return; }

  log('Seed: local DB is empty — pulling all records from Supabase…');

  try {
    // Pull profiles in pages of 1000.
    let profileCount = 0;
    let from = 0;
    while (true) {
      const { data, error } = await supa
        .from('profiles')
        .select('*')
        .range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const p of data) localDb.upsertProfile({ ...p, synced: 1, offline_created: 0 });
      profileCount += data.length;
      if (data.length < 1000) break;
      from += 1000;
    }
    log(`Seed: ${profileCount} profile(s) imported`);

    // Pull health_checkups in pages of 1000.
    let checkupCount = 0;
    from = 0;
    while (true) {
      const { data, error } = await supa
        .from('health_checkups')
        .select('*')
        .range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const c of data) localDb.upsertCheckupFromCloud(c);
      checkupCount += data.length;
      if (data.length < 1000) break;
      from += 1000;
    }
    log(`Seed: ${checkupCount} checkup(s) imported`);
    log('Seed: complete ✓');
  } catch (e) {
    err(`Seed failed: ${e.message}`);
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(signal) {
  log(`Received ${signal}. Shutting down…`);
  clearTimeout(retryTimer);
  stopBpMeasurement();

  if (wss) wss.close();
  if (serialPort && serialPort.isOpen) serialPort.close();

  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Entry point ─────────────────────────────────────────────────────────────

log('HealthSense Serial Bridge starting…');
startWebSocketServer();
connectSerial();

// Run seed on first start (no-op if DB already has data), then sync every 30 s.
setTimeout(seedFromCloud, 5000);
setTimeout(syncToCloud, 6000);
setInterval(syncToCloud, 30_000);
