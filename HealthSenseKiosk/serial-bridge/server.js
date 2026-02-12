/**
 * HealthSense Serial Bridge Server
 *
 * This server acts as a bridge between the ESP32 (via USB/Serial)
 * and the web-based kiosk application (via HTTP/WebSocket).
 *
 * Usage:
 *   npm install
 *   npm start
 */

const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');

// ============================================================================
// Configuration
// ============================================================================

const HTTP_PORT = 3000;
const WS_PORT = 3001;

// Serial port configuration - UPDATE THIS!
const SERIAL_PORT = 'COM3'; // Windows: COM3, COM4, etc. | Linux/Mac: /dev/ttyUSB0
const BAUD_RATE = 115200;

// ============================================================================
// Global State
// ============================================================================

let serialPort = null;
let parser = null;
let deviceInfo = null;
let isConnected = false;
let currentMeasurement = {
  isActive: false,
  type: null,
  measurementId: null,
  status: 'idle',
  progress: 0,
  currentValue: null
};

// ============================================================================
// Express Server Setup
// ============================================================================

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// WebSocket Server Setup
// ============================================================================

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('📱 WebSocket client connected');

  ws.on('close', () => {
    console.log('📱 WebSocket client disconnected');
  });
});

function broadcastToWebSocket(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// ============================================================================
// Serial Port Communication
// ============================================================================

function initSerialPort() {
  try {
    serialPort = new SerialPort({
      path: SERIAL_PORT,
      baudRate: BAUD_RATE
    });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    serialPort.on('open', () => {
      console.log('✅ Serial port opened:', SERIAL_PORT);
      isConnected = true;

      // Request device info on connect
      sendSerialCommand({ action: 'getDeviceInfo' });
    });

    serialPort.on('error', (err) => {
      console.error('❌ Serial port error:', err.message);
      isConnected = false;
    });

    serialPort.on('close', () => {
      console.log('🔌 Serial port closed');
      isConnected = false;
    });

    // Handle incoming data from ESP32
    parser.on('data', (line) => {
      try {
        const data = JSON.parse(line);
        handleSerialData(data);
      } catch (err) {
        // Not JSON, probably debug output
        console.log('📟 ESP32:', line.trim());
      }
    });

  } catch (err) {
    console.error('❌ Failed to open serial port:', err.message);
    console.log('\nTip: Run "npm run list-ports" to see available ports');
    process.exit(1);
  }
}

function sendSerialCommand(command) {
  if (serialPort && isConnected) {
    const message = JSON.stringify(command) + '\n';
    serialPort.write(message);
  } else {
    console.warn('⚠️ Cannot send command - serial port not connected');
  }
}

function handleSerialData(data) {
  console.log('📨 Received from ESP32:', data);

  switch (data.type) {
    case 'deviceInfo':
      deviceInfo = data.payload;
      console.log('📋 Device info updated');
      break;

    case 'measurementUpdate':
      currentMeasurement.status = 'measuring';
      currentMeasurement.progress = data.payload.progress;
      currentMeasurement.currentValue = data.payload.currentValue;

      // Broadcast to WebSocket clients
      broadcastToWebSocket({
        type: 'measurement_update',
        timestamp: new Date().toISOString(),
        payload: {
          measurementType: currentMeasurement.type,
          currentValue: data.payload.currentValue,
          progress: data.payload.progress
        }
      });
      break;

    case 'measurementComplete':
      currentMeasurement.status = 'completed';
      currentMeasurement.progress = 100;
      currentMeasurement.currentValue = data.payload.finalValue;
      currentMeasurement.isActive = false;

      // Broadcast to WebSocket clients
      broadcastToWebSocket({
        type: 'measurement_complete',
        timestamp: new Date().toISOString(),
        payload: {
          measurementType: currentMeasurement.type,
          finalValue: data.payload.finalValue
        }
      });
      break;

    case 'measurementError':
      currentMeasurement.status = 'error';
      currentMeasurement.isActive = false;

      // Broadcast to WebSocket clients
      broadcastToWebSocket({
        type: 'measurement_error',
        timestamp: new Date().toISOString(),
        payload: {
          measurementType: currentMeasurement.type,
          error: data.payload.error
        }
      });
      break;

    case 'pong':
      // Response to ping
      break;

    default:
      console.log('📨 Unknown message type:', data.type);
  }
}

// ============================================================================
// HTTP API Endpoints
// ============================================================================

// GET /api/ping - Health check
app.get('/api/ping', (req, res) => {
  sendSerialCommand({ action: 'ping' });

  res.json({
    success: isConnected,
    timestamp: new Date().toISOString(),
    message: isConnected ? 'Bridge connected to ESP32' : 'ESP32 not connected'
  });
});

// GET /api/device/info - Get device information
app.get('/api/device/info', (req, res) => {
  if (!deviceInfo) {
    // Request fresh device info
    sendSerialCommand({ action: 'getDeviceInfo' });

    // Return cached or default
    return res.json({
      firmwareVersion: 'unknown',
      deviceId: 'ESP32-SERIAL',
      lastCalibration: null,
      sensors: {
        temperature: true,
        heartRate: true,
        spO2: true,
        bloodPressure: true,
        height: true,
        weight: true
      }
    });
  }

  res.json(deviceInfo);
});

// POST /api/measurement/start - Start a measurement
app.post('/api/measurement/start', (req, res) => {
  const { type, patientId } = req.body;

  if (!type) {
    return res.status(400).json({
      success: false,
      error: 'Missing measurement type'
    });
  }

  const measurementId = `MEAS-${Date.now()}`;

  // Update state
  currentMeasurement = {
    isActive: true,
    type,
    measurementId,
    status: 'measuring',
    progress: 0,
    currentValue: null
  };

  // Send command to ESP32
  sendSerialCommand({
    action: 'startMeasurement',
    type,
    patientId,
    measurementId
  });

  res.json({
    success: true,
    measurementId,
    estimatedDuration: 5000
  });
});

// GET /api/measurement/status - Get measurement status
app.get('/api/measurement/status', (req, res) => {
  res.json({
    status: currentMeasurement.status,
    progress: currentMeasurement.progress,
    currentValue: currentMeasurement.currentValue
  });
});

// POST /api/measurement/stop - Stop measurement
app.post('/api/measurement/stop', (req, res) => {
  sendSerialCommand({
    action: 'stopMeasurement',
    type: currentMeasurement.type
  });

  currentMeasurement.isActive = false;
  currentMeasurement.status = 'idle';
  currentMeasurement.progress = 0;

  res.json({ success: true });
});

// ============================================================================
// Server Startup
// ============================================================================

app.listen(HTTP_PORT, () => {
  console.log('\n=================================');
  console.log('🏥 HealthSense Serial Bridge');
  console.log('=================================');
  console.log(`📡 HTTP Server: http://localhost:${HTTP_PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log(`📟 Serial Port: ${SERIAL_PORT} @ ${BAUD_RATE} baud`);
  console.log('=================================\n');

  // Initialize serial connection
  initSerialPort();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
  process.exit(0);
});
