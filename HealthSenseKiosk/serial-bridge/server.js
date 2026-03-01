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

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  // Serial port – overridable via env var.
  // On Raspberry Pi: '/dev/ttyUSB0' or '/dev/ttyACM0'
  // On Windows (dev): 'COM3', 'COM4', etc.
  SERIAL_PORT: process.env.HS_SERIAL_PORT || 'COM3',
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

// ─── Globals ──────────────────────────────────────────────────────────────────

/** @type {SerialPort | null} */
let serialPort = null;
let serialConnected = false;
let retryTimer = null;

/** Last sensorStatus payload received from the ESP32 – replayed to new WS clients. */
let lastSensorStatus = null;

/** @type {WebSocketServer} */
let wss;

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
      // Cache the latest sensorStatus so we can replay it to new WS clients
      if (msg.type === 'sensorStatus') {
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

// ─── WebSocket server ─────────────────────────────────────────────────────────

function startWebSocketServer() {
  // Use an underlying http.Server so we can inspect headers before upgrade
  const httpServer = createServer((_, res) => {
    res.writeHead(404).end('HealthSense Serial Bridge – WebSocket endpoint only.');
  });

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

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(signal) {
  log(`Received ${signal}. Shutting down…`);
  clearTimeout(retryTimer);

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
