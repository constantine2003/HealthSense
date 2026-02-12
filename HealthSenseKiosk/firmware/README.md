# HealthSense ESP32 Firmware

This firmware enables your NodeMCU ESP32S to communicate with the HealthSense kiosk app.

## Quick Start

### 1. Install Arduino IDE and ESP32 Support

Follow instructions in `../ESP32_SETUP_GUIDE.md`

### 2. Install Required Libraries

In Arduino IDE, install these libraries via Library Manager:
- **ESPAsyncWebServer** by me-no-dev
- **AsyncTCP** by me-no-dev
- **ArduinoJson** by Benoit Blanchon

### 3. Configure WiFi

Open `HealthSense_ESP32.ino` and update these lines:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";        // Your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Your WiFi password
```

### 4. Upload to ESP32

1. Connect ESP32 via USB
2. Select board: `Tools` → `Board` → `NodeMCU-32S`
3. Select port: `Tools` → `Port` → (your COM port)
4. Click Upload (→)

### 5. Get IP Address

Open Serial Monitor (115200 baud) and look for:
```
WiFi connected!
IP address: 192.168.1.150
```

### 6. Update Kiosk Configuration

Edit `HealthSenseKiosk/.env`:
```env
VITE_ESP32_BASE_URL=http://192.168.1.150
```

(Replace with your actual ESP32 IP)

### 7. Test Connection

Start the kiosk app and check the connection status in the top-right corner!

## Firmware Features

### HTTP API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ping` | GET | Health check |
| `/api/device/info` | GET | Device & sensor information |
| `/api/measurement/start` | POST | Start a measurement |
| `/api/measurement/status` | GET | Get current measurement status |
| `/api/measurement/stop` | POST | Stop active measurement |

### WebSocket Support

- **Endpoint**: `/ws`
- **Purpose**: Real-time measurement updates
- **Messages**: JSON formatted updates every 500ms

### Simulated Sensors

The firmware currently **simulates** sensor readings for testing:
- Temperature: 36.0 - 38.0°C
- Heart Rate: 60 - 100 bpm
- SpO2: 95 - 100%
- Weight: 50 - 100 kg
- Height: 150 - 190 cm

### CORS Support

All endpoints include CORS headers for web app communication.

## Testing the Firmware

### 1. Serial Monitor Test
After upload, open Serial Monitor (115200 baud):

```
=================================
HealthSense ESP32 Gateway
Firmware: 1.0.0
=================================

Connecting to WiFi: MyNetwork
✓ WiFi connected!
IP address: 192.168.1.150
✓ Web server started

Ready to accept connections!
Test with: http://192.168.1.150/api/ping
=================================
```

### 2. Browser Test

Open these URLs in your browser (replace IP):

**Health Check:**
```
http://192.168.1.150/api/ping
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-02-12T10:30:00Z",
  "message": "ESP32 is alive!"
}
```

**Device Info:**
```
http://192.168.1.150/api/device/info
```

Expected response:
```json
{
  "firmwareVersion": "1.0.0",
  "deviceId": "ESP32-001",
  "lastCalibration": null,
  "sensors": {
    "temperature": true,
    "heartRate": true,
    "spO2": true,
    "bloodPressure": true,
    "height": true,
    "weight": true
  }
}
```

### 3. curl Test (Command Line)

```bash
# Health check
curl http://192.168.1.150/api/ping

# Device info
curl http://192.168.1.150/api/device/info

# Start measurement
curl -X POST http://192.168.1.150/api/measurement/start \
  -H "Content-Type: application/json" \
  -d '{"type":"temperature","patientId":"P001"}'

# Check status
curl http://192.168.1.150/api/measurement/status
```

## Customization

### Change Device ID

```cpp
const char* DEVICE_ID = "ESP32-001";  // Change this
```

### Adjust Measurement Duration

```cpp
currentMeasurement.duration = 5000; // 5 seconds (in handleStartMeasurement)
```

### Add Real Sensors

Replace the `simulateSensorReading()` function with actual sensor code:

```cpp
float readTemperatureSensor() {
  // Read from DS18B20, DHT22, or other temp sensor
  return temperature;
}

// Then update in handleMeasurementStatus():
if (currentMeasurement.type == "temperature") {
  currentMeasurement.currentValue = readTemperatureSensor();
}
```

## Adding Real Sensors

### Temperature (DS18B20)
```cpp
#include <OneWire.h>
#include <DallasTemperature.h>

OneWire oneWire(4); // GPIO 4
DallasTemperature tempSensor(&oneWire);

void setup() {
  tempSensor.begin();
}

float readTemperature() {
  tempSensor.requestTemperatures();
  return tempSensor.getTempCByIndex(0);
}
```

### Heart Rate (MAX30102)
```cpp
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

MAX30105 particleSensor;

float readHeartRate() {
  long irValue = particleSensor.getIR();
  // Process signal to get heart rate
  return heartRate;
}
```

## Troubleshooting

### "WiFi connection failed"
- Check SSID and password spelling
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router

### "Compilation error"
- Install missing libraries
- Check Arduino IDE has ESP32 board support
- Update ESP32 board package

### "Upload failed"
- Try different USB cable (must support data)
- Install CH340/CP2102 USB driver
- Hold BOOT button while uploading

### Kiosk can't connect
- Verify IP address is correct in `.env`
- Check both devices are on same network
- Test API endpoints in browser first

## Next Steps

1. **Add Real Sensors** - Replace simulated readings with actual hardware
2. **Calibration** - Implement sensor calibration routines
3. **Data Validation** - Add range checking for measurements
4. **Error Handling** - Detect and report sensor failures
5. **OTA Updates** - Enable firmware updates over WiFi
6. **HTTPS** - Add secure communication
7. **Authentication** - Implement API key validation

## Support

For detailed setup instructions, see:
- `../ESP32_SETUP_GUIDE.md` - Hardware and Arduino IDE setup
- `../ESP32_CONNECTION_GUIDE.md` - API specification and testing
