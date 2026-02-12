# HealthSense Serial Bridge

Node.js server that bridges communication between ESP32 (via USB/Serial) and the kiosk web application (via HTTP/WebSocket).

## Why Use This?

When the ESP32 is physically connected to the Raspberry Pi (or your computer) via USB, this bridge allows the web app to communicate with it through a familiar HTTP API, without needing WiFi.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Find Your Serial Port
```bash
npm run list-ports
```

You'll see output like:
```
✅ Found 2 serial port(s):

1. COM3                          # Windows
   👉 This looks like your ESP32!

1. /dev/ttyUSB0                  # Linux/Mac
   👉 This looks like your ESP32!
```

### 3. Update Configuration
Edit `server.js` and update this line:

```javascript
const SERIAL_PORT = 'COM3'; // Windows: COM3, Linux: /dev/ttyUSB0
```

### 4. Start the Server
```bash
npm start
```

You should see:
```
=================================
🏥 HealthSense Serial Bridge
=================================
📡 HTTP Server: http://localhost:3000
🔌 WebSocket Server: ws://localhost:3001
📟 Serial Port: COM3 @ 115200 baud
=================================

✅ Serial port opened: COM3
```

### 5. Update Kiosk Configuration
In `HealthSenseKiosk/.env`:
```env
VITE_ESP32_BASE_URL=http://localhost:3000
```

## API Endpoints

The bridge exposes these HTTP endpoints (same as WiFi version):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ping` | GET | Health check |
| `/api/device/info` | GET | Get device & sensor info |
| `/api/measurement/start` | POST | Start a measurement |
| `/api/measurement/status` | GET | Get measurement progress |
| `/api/measurement/stop` | POST | Stop active measurement |

## WebSocket Support

Real-time measurement updates are sent via WebSocket on `ws://localhost:3001`

Message types:
- `measurement_update` - Progress updates every 500ms
- `measurement_complete` - Final value
- `measurement_error` - Error occurred
- `device_status` - Device connection status

## Communication Protocol

### Bridge → ESP32 (Commands)
JSON commands sent via serial:
```json
{"action":"ping"}
{"action":"getDeviceInfo"}
{"action":"startMeasurement","type":"temperature","patientId":"P001"}
{"action":"stopMeasurement"}
```

### ESP32 → Bridge (Responses)
JSON responses received via serial:
```json
{"type":"pong","timestamp":12345}
{"type":"deviceInfo","payload":{...}}
{"type":"measurementUpdate","payload":{"progress":50,"currentValue":36.5}}
{"type":"measurementComplete","payload":{"finalValue":36.8}}
```

## Testing

### Test Serial Connection
```bash
npm run list-ports
```

### Test HTTP Endpoints
```bash
# Health check
curl http://localhost:3000/api/ping

# Device info
curl http://localhost:3000/api/device/info

# Start measurement
curl -X POST http://localhost:3000/api/measurement/start \
  -H "Content-Type: application/json" \
  -d '{"type":"temperature","patientId":"P001"}'

# Check status
curl http://localhost:3000/api/measurement/status
```

## Development Mode

For auto-restart on file changes:
```bash
npm run dev
```

## Troubleshooting

### Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3000`

Another process is using port 3000.

**Solution**: Kill the process or change the port in `server.js`:
```javascript
const HTTP_PORT = 3001; // Use different port
```

### Serial Port Access Denied
**Error**: `Error: Access denied`

**Windows**: Close Arduino IDE Serial Monitor (only one program can use the port)

**Linux**: Add user to dialout group:
```bash
sudo usermod -a -G dialout $USER
# Log out and back in
```

### ESP32 Not Responding
- Check ESP32 has the **serial firmware** uploaded (not WiFi firmware)
- Verify baud rate is 115200 in both firmware and `server.js`
- Disconnect/reconnect USB cable
- Try different USB cable

### Module Not Found
```bash
npm install
```

## Files

- `server.js` - Main bridge server
- `list-ports.js` - Helper to find serial ports
- `package.json` - Dependencies

## Deployment

### Windows (Development)
```bash
npm start
```

### Linux/Raspberry Pi (Production)
Create systemd service (see `RASPBERRY_PI_DEPLOYMENT.md`)

## Configuration Options

In `server.js`:

```javascript
// Server ports
const HTTP_PORT = 3000;
const WS_PORT = 3001;

// Serial port settings
const SERIAL_PORT = 'COM3';  // Update this!
const BAUD_RATE = 115200;
```

## Performance

- Handles multiple simultaneous WebSocket connections
- Serial messages processed in real-time
- HTTP responses are non-blocking
- Automatic reconnection if serial port disconnects

## Next Steps

- Add authentication middleware
- Implement request logging
- Add HTTPS support
- Store measurement history

## Support

See documentation:
- `TESTING_SERIAL_SETUP.md` - Testing on your computer
- `RASPBERRY_PI_DEPLOYMENT.md` - Production deployment
