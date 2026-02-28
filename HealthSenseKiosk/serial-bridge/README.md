# HealthSense Serial Bridge

Node.js server that reads sensor data from the ESP32 over a wired serial connection and exposes it to the Svelte kiosk app via a secure WebSocket.

## Architecture

```
ESP32 --[USB/UART]--> Raspberry Pi 5 (or dev PC)
                           |
                    serial-bridge/server.js   (this process)
                           |  WebSocket ws://127.0.0.1:8089
                    HealthSenseKiosk (Svelte app)
```

## Security

- The WebSocket server binds to **127.0.0.1 only** (loopback). It is never reachable from the network.
- Every WebSocket connection must supply a shared secret token via the `?token=` query param.
- The same token must be set in the Svelte app's `.env` (`VITE_HS_TOKEN`).

## Running

```bash
cd serial-bridge
npm start           # production
npm run dev         # auto-restart on file change (Node 18+)
```

## Environment Variables

| Variable         | Default                          | Description                          |
|------------------|----------------------------------|--------------------------------------|
| `HS_SERIAL_PORT` | `COM3` (Windows) / `/dev/ttyUSB0`| Serial port the ESP32 is connected to|
| `HS_BAUD_RATE`   | `115200`                         | Serial baud rate                      |
| `HS_WS_PORT`     | `8089`                           | WebSocket server port                 |
| `HS_TOKEN`       | `hs-local-dev-token-change-me`   | Shared auth token (**change this!**)  |

Example for Raspberry Pi:
```bash
HS_SERIAL_PORT=/dev/ttyACM0 HS_TOKEN=my-production-secret npm start
```

## ESP32 Serial Protocol

The ESP32 sends **newline-delimited JSON** over its serial port:

| Direction       | Message                                                    |
|-----------------|------------------------------------------------------------|
| ESP32 → Bridge  | `{"type":"status","connected":true}`                       |
| ESP32 → Bridge  | `{"type":"progress","sensor":"weight","progress":50}`      |
| ESP32 → Bridge  | `{"type":"reading","sensor":"weight","value":72.4}`        |
| ESP32 → Bridge  | `{"type":"reading","sensor":"bp","value":"120/80"}`        |
| ESP32 → Bridge  | `{"type":"error","sensor":"weight","message":"Timeout"}`   |
| Bridge → ESP32  | `{"command":"start","sensor":"weight"}`                    |
| Bridge → ESP32  | `{"command":"cancel"}`                                     |

## Development Without Hardware

If the serial port cannot be opened (ESP32 not plugged in), the bridge retries every 3 seconds. The Svelte app falls back to **mock / simulated data** automatically when the bridge is unavailable, so UI development can continue without hardware.
