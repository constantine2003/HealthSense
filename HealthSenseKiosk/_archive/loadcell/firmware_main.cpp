#include <Arduino.h>
#include <Wire.h>
#include <MAX30105.h>
#include <spo2_algorithm.h>
#include <Adafruit_MLX90614.h>
#include <Adafruit_VL53L0X.h>
#include <Adafruit_Fingerprint.h>
#include <HX711.h>
#include <ArduinoJson.h>

// ─── Serial protocol (newline-delimited JSON) ─────────────────────────────────
//
//  ESP32 → Bridge (output):
//    {"type":"sensorStatus","sensors":{"weight":false,"height":false,"temp":true,"spo2":false,"bp":false}}
//    {"type":"progress","sensor":"temp","progress":40}
//    {"type":"reading","sensor":"temp","value":36.6}
//    {"type":"reading","sensor":"spo2","value":{"spo2":98,"heartRate":72}}
//    {"type":"error","sensor":"temp","message":"Read error"}
//
//  Bridge → ESP32 (input):
//    {"command":"start","sensor":"temp"}
//    {"command":"cancel"}
//    {"command":"status"}

// ─── Sensor objects ───────────────────────────────────────────────────────────
MAX30105          particleSensor;
Adafruit_MLX90614 mlx;
Adafruit_VL53L0X  vl53;        // VL53L0X ToF distance sensor (mounted 2 m above floor)

// AS608 fingerprint sensor on UART2 (RX=16, TX=17)
HardwareSerial          fpSerial(2);
Adafruit_Fingerprint    finger = Adafruit_Fingerprint(&fpSerial);

// HX711 load-cell ADC (weight)
// Wiring: DOUT → GPIO 4, SCK → GPIO 5
// To calibrate: put a known weight on the scale, read raw with scale.get_units(10),
// then set WEIGHT_SCALE_FACTOR = raw_reading / known_weight_kg.
// Default value below is a placeholder — MUST be calibrated before clinical use.
const int   HX711_DOUT_PIN      = 4;
const int   HX711_SCK_PIN       = 5;
const float WEIGHT_SCALE_FACTOR = 420.0f;   // placeholder — calibrate before use
HX711 scale;

// ─── Sensor availability ──────────────────────────────────────────────────────
bool tempReady   = false;   // GY-906 / MLX90614
bool heightReady = false;   // VL53L0X time-of-flight (mounted 2 m above floor)
bool hrSpo2Ready = false;   // MAX30102 combined HR + SpO2 sensor
bool fpReady     = false;   // AS608 fingerprint sensor
bool weightReady = false;   // HX711 load-cell ADC

// Periodic status refresh so the UI reflects live wiring changes (disconnect/reconnect)
const unsigned long SENSOR_STATUS_POLL_MS = 1500;
unsigned long lastSensorStatusPoll = 0;

// ─── Measurement state machine ────────────────────────────────────────────────
enum MeasureState {
  IDLE,
  MEASURING_TEMP,
  MEASURING_HEIGHT,
  MEASURING_HR_SPO2,
  MEASURING_WEIGHT,
  FP_ENROLL_WAIT_FIRST,   // waiting for first finger placement
  FP_ENROLL_WAIT_LIFT,    // first capture done, waiting for the finger to lift
  FP_ENROLL_WAIT_SECOND,  // waiting for the same finger a second time
  FP_VERIFY_WAIT          // waiting for finger to match against stored templates
};
MeasureState state = IDLE;

// Fingerprint enrollment tracking
int fpEnrollSlot = 0;   // slot (1-127) assigned by the webapp during enroll

// Temp measurement bookkeeping
const int    TEMP_SAMPLES   = 5;        // samples to average
const unsigned long TEMP_INTERVAL = 500; // ms between samples
int          tempSampleCount = 0;
float        tempSum         = 0.0f;
unsigned long lastTempSample = 0;

// Height measurement bookkeeping
// The VL53L0X is mounted exactly 2000 mm above the floor.
// height = MOUNT_HEIGHT_MM - measured_distance_mm
const float  MOUNT_HEIGHT_MM    = 2000.0f;
const int    HEIGHT_SAMPLES     = 10;       // samples to average
const unsigned long HEIGHT_INTERVAL = 100;  // ms between samples
const int    HEIGHT_MIN_MM      = 500;      // sanity floor  (~0.5 m)
const int    HEIGHT_MAX_MM      = 2500;     // sanity ceiling (~2.5 m above sensor = negative, clamped)
int          heightSampleCount  = 0;
float        heightSum_mm       = 0.0f;
unsigned long lastHeightSample  = 0;

// MAX30102 combined HR + SpO2 measurement bookkeeping
const unsigned long HR_SPO2_TIMEOUT_MS      = 20000;   // overall timeout for a full acquisition
const uint32_t      HR_SPO2_MIN_IR_LEVEL    = 5000;    // lenient finger-detect threshold
const int           HR_SPO2_RECALC_STRIDE   = 25;      // recompute after each additional 25 samples
unsigned long hrSpo2StartedAt   = 0;
int           hrSpo2BufferCount = 0;
int           hrSpo2NewSamples  = 0;
bool          hrSpo2Computed    = false;
#if defined(__AVR_ATmega328P__) || defined(__AVR_ATmega168__)
uint16_t      hrSpo2IrBuffer[BUFFER_SIZE];
uint16_t      hrSpo2RedBuffer[BUFFER_SIZE];
#else
uint32_t      hrSpo2IrBuffer[BUFFER_SIZE];
uint32_t      hrSpo2RedBuffer[BUFFER_SIZE];
#endif

// ─── Serial command buffer ────────────────────────────────────────────────────
String inputBuffer = "";

// ─── Weight measurement bookkeeping ──────────────────────────────────────────
const int           WEIGHT_SAMPLES          = 15;     // samples to average (increased for stability)
const unsigned long WEIGHT_SAMPLE_INTERVAL  = 300;    // ms between samples (≥100ms for HX711 10Hz rate)
int           weightSampleCount = 0;
float         weightSum         = 0.0f;
unsigned long lastWeightSample  = 0;

// ─── Forward declarations ─────────────────────────────────────────────────────
void sendSensorStatus();
void handleCommand(const String& json);
void tempMeasureLoop();
void heightMeasureLoop();
void hrSpo2MeasureLoop();
void weightMeasureLoop();
void fpEnrollFirstLoop();
void fpEnrollLiftLoop();
void fpEnrollSecondLoop();
void fpVerifyLoop();
void emitJson(JsonDocument& doc);
void scanI2C();
void refreshSensorAvailability(bool forceEmit);
bool isI2CDevicePresent(uint8_t address);
bool isFingerprintBusy();
void resetHrSpo2Measurement();
void configureHrSpo2SensorForRead();
void setHrSpo2SensorIdle();

void setup() {
  Serial.begin(115200);
  delay(200);

  // ── I2C init (SDA=21, SCL=22) ─────────────────────────────────────────────
  Wire.begin(21, 22);
  delay(300);

  // ── I2C bus scan — emits {"type":"i2cScan","found":[...]} for debugging ────
  scanI2C();

  // ── Probe GY-906 / MLX90614 (temp) at 0x5A ────────────────────────────────
  tempReady = mlx.begin(0x5A, &Wire);

  // ── Probe VL53L0X (height) at 0x29 ───────────────────────────────────────
  // Pass debug=true so the library prints init errors to Serial if it fails.
  heightReady = vl53.begin(0x29, true, &Wire);
  if (heightReady) {
    // High accuracy mode: ~200ms timing budget, good enough for a still person.
    vl53.configSensor(Adafruit_VL53L0X::VL53L0X_SENSE_HIGH_ACCURACY);
  }

  // ── Probe MAX30102 (HR + SpO2) at 0x57 ────────────────────────────────────
  hrSpo2Ready = particleSensor.begin(Wire, I2C_SPEED_STANDARD);
  if (hrSpo2Ready) {
    setHrSpo2SensorIdle();
  }

  // ── Probe AS608 fingerprint sensor on UART2 (57600 baud, RX=16, TX=17) ──────
  fpSerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);
  delay(300);
  fpReady = finger.verifyPassword();

  // ── Probe HX711 load-cell ADC (DOUT=4, SCK=5) ────────────────────────────
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  delay(1000);   // allow HX711 to settle before tare (was 100ms — too short)
  if (scale.is_ready()) {
    scale.set_scale(WEIGHT_SCALE_FACTOR);
    scale.tare();   // zero the scale with no load
    weightReady = true;
  }

  // ── Announce sensor availability to the bridge ────────────────────────────
  refreshSensorAvailability(true);
}

void loop() {
  // ── Read incoming commands (newline-delimited JSON) ────────────────────────
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      inputBuffer.trim();
      if (inputBuffer.length() > 0) {
        handleCommand(inputBuffer);
      }
      inputBuffer = "";
    } else {
      inputBuffer += c;
    }
  }

  // ── Periodic live sensor health refresh (disconnect/reconnect detection) ──
  unsigned long now = millis();
  if (lastSensorStatusPoll == 0 || (now - lastSensorStatusPoll) >= SENSOR_STATUS_POLL_MS) {
    lastSensorStatusPoll = now;
    refreshSensorAvailability(false);
  }

  // ── Run active measurement / fingerprint operation ───────────────────────
  if (state == MEASURING_TEMP)        tempMeasureLoop();
  if (state == MEASURING_HEIGHT)      heightMeasureLoop();
  if (state == MEASURING_HR_SPO2)     hrSpo2MeasureLoop();
  if (state == MEASURING_WEIGHT)      weightMeasureLoop();
  if (state == FP_ENROLL_WAIT_FIRST)   fpEnrollFirstLoop();
  if (state == FP_ENROLL_WAIT_LIFT)    fpEnrollLiftLoop();
  if (state == FP_ENROLL_WAIT_SECOND)  fpEnrollSecondLoop();
  if (state == FP_VERIFY_WAIT)         fpVerifyLoop();
}

// ─── I2C scanner ─────────────────────────────────────────────────────────────
//
// Runs once at startup. Emits {"type":"i2cScan","found":["0x29","0x5A",...]}
// so you can confirm which devices are actually on the bus.
void scanI2C() {
  StaticJsonDocument<256> doc;
  doc["type"] = "i2cScan";
  JsonArray found = doc.createNestedArray("found");

  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      char buf[7];
      snprintf(buf, sizeof(buf), "0x%02X", addr);
      found.add(buf);
    }
  }
  emitJson(doc);
}

bool isI2CDevicePresent(uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

bool isFingerprintBusy() {
  return state == FP_ENROLL_WAIT_FIRST
      || state == FP_ENROLL_WAIT_LIFT
      || state == FP_ENROLL_WAIT_SECOND
      || state == FP_VERIFY_WAIT;
}

void resetHrSpo2Measurement() {
  hrSpo2StartedAt  = 0;
  hrSpo2BufferCount = 0;
  hrSpo2NewSamples  = 0;
  hrSpo2Computed    = false;
}

void configureHrSpo2SensorForRead() {
  // SparkFun / Maxim-recommended setup for buffered HR + SpO2 acquisition.
  const byte ledBrightness = 60;   // 0-255
  const byte sampleAverage = 4;
  const byte ledMode       = 2;    // Red + IR
  const int sampleRate     = 100;  // Hz
  const int pulseWidth     = 411;  // us
  const int adcRange       = 4096;

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeRed(0x24);
  particleSensor.setPulseAmplitudeIR(0x24);
  particleSensor.setPulseAmplitudeGreen(0);
  particleSensor.clearFIFO();
}

void setHrSpo2SensorIdle() {
  // Keep LEDs off when not measuring to reduce heat/noise/power.
  particleSensor.setPulseAmplitudeRed(0);
  particleSensor.setPulseAmplitudeIR(0);
  particleSensor.setPulseAmplitudeGreen(0);
}

void refreshSensorAvailability(bool forceEmit) {
  const bool prevTemp   = tempReady;
  const bool prevHeight = heightReady;
  const bool prevHrSpo2 = hrSpo2Ready;
  const bool prevFp     = fpReady;
  const bool prevWeight = weightReady;

  // Temperature (MLX90614 @ 0x5A)
  if (!isI2CDevicePresent(0x5A)) {
    tempReady = false;
  } else if (!tempReady) {
    tempReady = mlx.begin(0x5A, &Wire);
  } else {
    tempReady = true;
  }

  // Height (VL53L0X @ 0x29)
  if (!isI2CDevicePresent(0x29)) {
    heightReady = false;
  } else if (!heightReady) {
    heightReady = vl53.begin(0x29, false, &Wire);
    if (heightReady) {
      vl53.configSensor(Adafruit_VL53L0X::VL53L0X_SENSE_HIGH_ACCURACY);
    }
  } else {
    heightReady = true;
  }

  // MAX30102 board presence (HR + SpO2) @ 0x57
  if (!isI2CDevicePresent(0x57)) {
    hrSpo2Ready = false;
  } else if (!hrSpo2Ready) {
    hrSpo2Ready = particleSensor.begin(Wire, I2C_SPEED_STANDARD);
    if (hrSpo2Ready) {
      setHrSpo2SensorIdle();
    }
  } else {
    hrSpo2Ready = true;
  }

  // Fingerprint (AS608) — avoid polling verifyPassword while an fp operation is active
  if (!isFingerprintBusy()) {
    fpReady = finger.verifyPassword();
  }

  // HX711 (weight) — avoid probing during active measurement (DOUT state varies mid-cycle)
  if (state != MEASURING_WEIGHT) {
    if (!scale.is_ready()) {
      weightReady = false;
    } else if (!weightReady) {
      // Sensor just reconnected — re-apply scale factor and tare
      scale.set_scale(WEIGHT_SCALE_FACTOR);
      scale.tare();
      weightReady = true;
    }
    // else: weightReady stays true
  }

  const bool changed =
      (prevTemp   != tempReady)
   || (prevHeight != heightReady)
   || (prevHrSpo2 != hrSpo2Ready)
   || (prevFp     != fpReady)
   || (prevWeight != weightReady);

  if (forceEmit || changed) {
    sendSensorStatus();
  }

  // Abort active measurement if its sensor disappears mid-read
  if (!tempReady && state == MEASURING_TEMP) {
    state = IDLE;
    tempSampleCount = 0;
    tempSum = 0.0f;
    StaticJsonDocument<128> e;
    e["type"] = "error";
    e["sensor"] = "temp";
    e["message"] = "Temperature sensor disconnected";
    emitJson(e);
  }

  if (!heightReady && state == MEASURING_HEIGHT) {
    state = IDLE;
    heightSampleCount = 0;
    heightSum_mm = 0.0f;
    StaticJsonDocument<128> e;
    e["type"] = "error";
    e["sensor"] = "height";
    e["message"] = "Height sensor disconnected";
    emitJson(e);
  }

  if (!hrSpo2Ready && state == MEASURING_HR_SPO2) {
    state = IDLE;
    resetHrSpo2Measurement();
    StaticJsonDocument<128> e;
    e["type"] = "error";
    e["sensor"] = "spo2";
    e["message"] = "HR + SpO2 sensor disconnected";
    emitJson(e);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Serialize a JsonDocument to Serial as one complete JSON line. */
void emitJson(JsonDocument& doc) {
  serializeJson(doc, Serial);
  Serial.print('\n');
}

/** Broadcast current sensor availability to the bridge. */
void sendSensorStatus() {
  StaticJsonDocument<192> doc;
  doc["type"] = "sensorStatus";
  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["weight"]      = weightReady;
  sensors["height"]      = heightReady;
  sensors["temp"]        = tempReady;
  sensors["spo2"]        = hrSpo2Ready;   // protocol key 'spo2' maps to HR + SpO2
  sensors["bp"]          = false;
  sensors["fingerprint"] = fpReady;
  emitJson(doc);
}

/** Parse and dispatch a command received from the bridge. */
void handleCommand(const String& json) {
  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) return; // silently ignore malformed input

  const char* command = doc["command"];
  if (!command) return;

  // ── status ────────────────────────────────────────────────────────────────
  if (strcmp(command, "status") == 0) {
    sendSensorStatus();
    return;
  }

  // ── cancel (covers both measurement and fingerprint operations) ──────────
  if (strcmp(command, "cancel") == 0 || strcmp(command, "fp_cancel") == 0) {
    state             = IDLE;
    tempSampleCount   = 0;
    tempSum           = 0.0f;
    heightSampleCount = 0;
    heightSum_mm      = 0.0f;
    weightSampleCount = 0;
    weightSum         = 0.0f;
    resetHrSpo2Measurement();
    if (hrSpo2Ready) setHrSpo2SensorIdle();
    fpEnrollSlot      = 0;
    return;
  }

  // ── tare (zero the scale on demand) ──────────────────────────────────────
  if (strcmp(command, "tare") == 0) {
    if (weightReady) {
      scale.tare(20);   // 20-sample tare (~2s) for stable zero offset
      StaticJsonDocument<64> r;
      r["type"] = "tare_done";
      emitJson(r);
    }
    return;
  }

  // ── weight_raw (calibration helper: returns raw ADC - tare, no scale) ────
  // Use this to find the correct WEIGHT_SCALE_FACTOR:
  //   1. Tare empty scale
  //   2. Place known weight (kg)
  //   3. Send {"command":"weight_raw"} → note returned value
  //   4. WEIGHT_SCALE_FACTOR = returned_value / known_weight_kg
  if (strcmp(command, "weight_raw") == 0) {
    if (!weightReady) return;
    float savedScale = scale.get_scale();
    scale.set_scale(1);           // disable scaling so get_units() = raw - tare
    float raw = scale.get_units(40);   // 40 samples (~4s) for stable average
    scale.set_scale(savedScale);  // restore
    StaticJsonDocument<96> r;
    r["type"]  = "weight_raw";
    r["value"] = serialized(String(raw, 0));
    emitJson(r);
    return;
  }

  // ── set_weight_scale (calibration helper: set scale factor without reflash) ─
  // Example: {"command":"set_weight_scale","value":430000}
  // Takes effect immediately; persists until reboot.
  if (strcmp(command, "set_weight_scale") == 0) {
    float newScale = doc["value"] | 0.0f;
    if (newScale > 0.0f && weightReady) {
      scale.set_scale(newScale);
      StaticJsonDocument<96> r;
      r["type"]  = "weight_scale_set";
      r["value"] = serialized(String(newScale, 1));
      emitJson(r);
    }
    return;
  }

  // ── start ─────────────────────────────────────────────────────────────────
  if (strcmp(command, "start") == 0) {
    // Re-check actual hardware state just before starting any measurement.
    refreshSensorAvailability(false);

    const char* sensor = doc["sensor"];
    if (!sensor) return;

    if (strcmp(sensor, "temp") == 0) {
      if (!tempReady) {
        StaticJsonDocument<128> e;
        e["type"]    = "error";
        e["sensor"]  = "temp";
        e["message"] = "Temperature sensor not found";
        emitJson(e);
        return;
      }
      // Kick off temperature measurement
      state           = MEASURING_TEMP;
      tempSampleCount = 0;
      tempSum         = 0.0f;
      lastTempSample  = 0;   // 0 forces an immediate first sample
      return;
    }

    if (strcmp(sensor, "height") == 0) {
      if (!heightReady) {
        StaticJsonDocument<128> e;
        e["type"]    = "error";
        e["sensor"]  = "height";
        e["message"] = "Height sensor (VL53L0X) not found";
        emitJson(e);
        return;
      }
      // Kick off height measurement
      state              = MEASURING_HEIGHT;
      heightSampleCount  = 0;
      heightSum_mm       = 0.0f;
      lastHeightSample   = 0;  // 0 forces an immediate first sample
      return;
    }

    if (strcmp(sensor, "spo2") == 0) {
      if (!hrSpo2Ready) {
        StaticJsonDocument<128> e;
        e["type"]    = "error";
        e["sensor"]  = "spo2";
        e["message"] = "HR + SpO2 sensor (MAX30102) not found";
        emitJson(e);
        return;
      }

      resetHrSpo2Measurement();
      configureHrSpo2SensorForRead();
      state = MEASURING_HR_SPO2;
      return;
    }

    if (strcmp(sensor, "weight") == 0) {
      if (!weightReady) {
        StaticJsonDocument<128> e;
        e["type"]    = "error";
        e["sensor"]  = "weight";
        e["message"] = "Weight sensor (HX711) not found";
        emitJson(e);
        return;
      }
      // Re-zero the scale now (before the patient steps on, during the UI countdown).
      // Uses 5 samples (~500 ms at 10 SPS) — short enough to not block other work.
      scale.tare(5);
      state             = MEASURING_WEIGHT;
      weightSampleCount = 0;
      weightSum         = 0.0f;
      lastWeightSample  = 0;
      return;
    }

    // Other sensors: not yet implemented
    StaticJsonDocument<128> e;
    e["type"]    = "error";
    e["sensor"]  = sensor;
    e["message"] = "Sensor not yet implemented";
    emitJson(e);
  }

  // ── fp_enroll ─────────────────────────────────────────────────────────────
  if (strcmp(command, "fp_enroll") == 0) {
    refreshSensorAvailability(false);
    if (!fpReady) {
      StaticJsonDocument<128> e;
      e["type"]    = "error";
      e["sensor"]  = "fingerprint";
      e["message"] = "Fingerprint sensor not found";
      emitJson(e);
      return;
    }
    fpEnrollSlot = doc["slot"] | 1;   // webapp assigns the slot number
    state = FP_ENROLL_WAIT_FIRST;
    StaticJsonDocument<128> p;
    p["type"]    = "fp_progress";
    p["step"]    = "place_finger";
    p["message"] = "Place your finger on the sensor";
    emitJson(p);
    return;
  }

  // ── fp_verify ────────────────────────────────────────────────────────────
  if (strcmp(command, "fp_verify") == 0) {
    refreshSensorAvailability(false);
    if (!fpReady) {
      StaticJsonDocument<128> e;
      e["type"]    = "error";
      e["sensor"]  = "fingerprint";
      e["message"] = "Fingerprint sensor not found";
      emitJson(e);
      return;
    }
    state = FP_VERIFY_WAIT;
    StaticJsonDocument<128> p;
    p["type"]    = "fp_progress";
    p["step"]    = "place_finger";
    p["message"] = "Place your finger on the sensor";
    emitJson(p);
    return;
  }
}

// ─── Temperature measurement ──────────────────────────────────────────────────

void hrSpo2MeasureLoop() {
  if (!hrSpo2Ready) {
    state = IDLE;
    resetHrSpo2Measurement();
    StaticJsonDocument<128> e;
    e["type"] = "error";
    e["sensor"] = "spo2";
    e["message"] = "HR + SpO2 sensor not available";
    emitJson(e);
    return;
  }

  unsigned long now = millis();
  if (hrSpo2StartedAt == 0) hrSpo2StartedAt = now;

  // Pull any queued FIFO samples from the MAX30102.
  particleSensor.check();
  while (particleSensor.available()) {
    const uint32_t redValue = particleSensor.getFIFORed();
    const uint32_t irValue  = particleSensor.getFIFOIR();
    particleSensor.nextSample();

    if (hrSpo2BufferCount < BUFFER_SIZE) {
      hrSpo2RedBuffer[hrSpo2BufferCount] = redValue;
      hrSpo2IrBuffer[hrSpo2BufferCount]  = irValue;
      hrSpo2BufferCount++;
    } else {
      memmove(hrSpo2RedBuffer, hrSpo2RedBuffer + 1, sizeof(hrSpo2RedBuffer[0]) * (BUFFER_SIZE - 1));
      memmove(hrSpo2IrBuffer,  hrSpo2IrBuffer + 1,  sizeof(hrSpo2IrBuffer[0])  * (BUFFER_SIZE - 1));
      hrSpo2RedBuffer[BUFFER_SIZE - 1] = redValue;
      hrSpo2IrBuffer[BUFFER_SIZE - 1]  = irValue;
      hrSpo2NewSamples++;
    }
  }

  unsigned long elapsed = now - hrSpo2StartedAt;
  int progress = 0;
  if (hrSpo2BufferCount < BUFFER_SIZE) {
    progress = (hrSpo2BufferCount * 80) / BUFFER_SIZE;
  } else {
    progress = 80 + (int)min(19UL, ((elapsed > 0 ? elapsed : 1) * 19UL) / HR_SPO2_TIMEOUT_MS);
  }

  {
    StaticJsonDocument<96> p;
    p["type"] = "progress";
    p["sensor"] = "spo2";
    p["progress"] = progress;
    emitJson(p);
  }

  const bool haveWindow = hrSpo2BufferCount >= BUFFER_SIZE;
  const bool shouldRecalculate = haveWindow && (!hrSpo2Computed || hrSpo2NewSamples >= HR_SPO2_RECALC_STRIDE);

  if (shouldRecalculate) {
    hrSpo2Computed = true;
    hrSpo2NewSamples = 0;

    uint64_t irSum = 0;
    for (int i = 0; i < BUFFER_SIZE; i++) {
      irSum += hrSpo2IrBuffer[i];
    }
    const uint32_t avgIr = (uint32_t)(irSum / BUFFER_SIZE);

    int32_t spo2 = 0;
    int8_t  validSpo2 = 0;
    int32_t heartRate = 0;
    int8_t  validHeartRate = 0;
    maxim_heart_rate_and_oxygen_saturation(
      hrSpo2IrBuffer,
      BUFFER_SIZE,
      hrSpo2RedBuffer,
      &spo2,
      &validSpo2,
      &heartRate,
      &validHeartRate
    );

    if (avgIr >= HR_SPO2_MIN_IR_LEVEL && validSpo2 == 1 && validHeartRate == 1
        && heartRate >= 35 && heartRate <= 210 && spo2 >= 70 && spo2 <= 100) {
      state = IDLE;
      setHrSpo2SensorIdle();

      StaticJsonDocument<160> r;
      r["type"] = "reading";
      r["sensor"] = "spo2";
      JsonObject value = r.createNestedObject("value");
      value["spo2"] = spo2;
      value["heartRate"] = heartRate;
      emitJson(r);

      resetHrSpo2Measurement();
      return;
    }
  }

  if (elapsed < HR_SPO2_TIMEOUT_MS) return;

  state = IDLE;
  setHrSpo2SensorIdle();
  resetHrSpo2Measurement();

  StaticJsonDocument<128> e;
  e["type"] = "error";
  e["sensor"] = "spo2";
  e["message"] = "Unable to stabilize HR + SpO2 — adjust finger pressure and retry";
  emitJson(e);
  sendSensorStatus();
}

// ─── Fingerprint — enrollment first scan ─────────────────────────────────────

void fpEnrollFirstLoop() {
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) return;   // nobody placed a finger yet
  if (p != FINGERPRINT_OK) {
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Image capture failed — try again";
    emitJson(e);
    return;
  }
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Image processing failed — try again";
    emitJson(e);
    return;
  }
  state = FP_ENROLL_WAIT_LIFT;
  StaticJsonDocument<128> p2;
  p2["type"] = "fp_progress"; p2["step"] = "lift_finger";
  p2["message"] = "Lift your finger";
  emitJson(p2);
}

// ─── Fingerprint — wait for lift between scans ────────────────────────────────

void fpEnrollLiftLoop() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_NOFINGER) return;   // still touching — wait
  state = FP_ENROLL_WAIT_SECOND;
  StaticJsonDocument<128> p2;
  p2["type"] = "fp_progress"; p2["step"] = "place_again";
  p2["message"] = "Place the same finger again";
  emitJson(p2);
}

// ─── Fingerprint — enrollment second scan + store ─────────────────────────────

void fpEnrollSecondLoop() {
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) return;
  if (p != FINGERPRINT_OK) {
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Second image capture failed — please restart";
    emitJson(e);
    return;
  }
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Second image processing failed — please restart";
    emitJson(e);
    return;
  }
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Fingerprints did not match — please restart";
    emitJson(e);
    return;
  }
  p = finger.storeModel(fpEnrollSlot);
  state = IDLE;
  if (p != FINGERPRINT_OK) {
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Failed to store fingerprint — flash write error";
    emitJson(e);
    return;
  }
  StaticJsonDocument<64> r;
  r["type"] = "fp_enrolled";
  r["slot"] = fpEnrollSlot;
  emitJson(r);
}

// ─── Fingerprint — verification (search all stored templates) ─────────────────

void fpVerifyLoop() {
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) return;
  if (p != FINGERPRINT_OK) {
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Image capture failed — try again";
    emitJson(e);
    return;
  }
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"] = "error"; e["sensor"] = "fingerprint";
    e["message"] = "Image processing failed — try again";
    emitJson(e);
    return;
  }
  p = finger.fingerFastSearch();
  state = IDLE;
  if (p == FINGERPRINT_OK) {
    StaticJsonDocument<96> r;
    r["type"]       = "fp_match";
    r["slot"]       = finger.fingerID;
    r["confidence"] = finger.confidence;
    emitJson(r);
  } else {
    StaticJsonDocument<32> r;
    r["type"] = "fp_noMatch";
    emitJson(r);
  }
}

// ─── Temperature measurement ──────────────────────────────────────────────────

void tempMeasureLoop() {
  unsigned long now = millis();
  if (lastTempSample != 0 && (now - lastTempSample) < TEMP_INTERVAL) return;
  lastTempSample = now;

  // readObjectTempC() returns the surface (object) temperature, not ambient.
  float objectC = mlx.readObjectTempC();

  if (isnan(objectC)) {
    // Sensor returned a NaN — hardware read failure
    state = IDLE;
    StaticJsonDocument<128> e;
    e["type"]    = "error";
    e["sensor"]  = "temp";
    e["message"] = "Sensor read failure";
    emitJson(e);
    return;
  }

  tempSum += objectC;
  tempSampleCount++;

  int progress = (tempSampleCount * 100) / TEMP_SAMPLES;

  // Emit progress
  {
    StaticJsonDocument<96> p;
    p["type"]     = "progress";
    p["sensor"]   = "temp";
    p["progress"] = progress;
    emitJson(p);
  }

  // Final sample reached — emit averaged reading
  if (tempSampleCount >= TEMP_SAMPLES) {
    float avg = tempSum / (float)TEMP_SAMPLES;
    // Round to one decimal place
    avg = roundf(avg * 10.0f) / 10.0f;

    StaticJsonDocument<96> r;
    r["type"]   = "reading";
    r["sensor"] = "temp";
    r["value"]  = serialized(String(avg, 1));
    emitJson(r);

    state           = IDLE;
    tempSampleCount = 0;
    tempSum         = 0.0f;
  }
}

// ─── Height measurement (VL53L0X, mounted 2 m above the floor) ───────────────
//
//  height(m) = (MOUNT_HEIGHT_MM - measured_distance_mm) / 1000.0
//
void heightMeasureLoop() {
  unsigned long now = millis();
  if (lastHeightSample != 0 && (now - lastHeightSample) < HEIGHT_INTERVAL) return;
  lastHeightSample = now;

  VL53L0X_RangingMeasurementData_t measure;
  vl53.rangingTest(&measure, false);   // false = no debug serial output

  // RangeStatus == 4 means "out of range" / signal failure — discard.
  if (measure.RangeStatus == 4) {
    // Don't abort on a single bad sample; just skip this tick.
    // If we never get valid samples the loop will naturally timeout when
    // the webapp cancels, or we can check for a timeout here in future.
    return;
  }

  uint16_t dist_mm = measure.RangeMilliMeter;

  // Sanity check: sensor should read 0–1500 mm for a person (0.5 m to 2.0 m tall).
  // Reject readings where the person is clearly off-center or nothing is there.
  if (dist_mm < 10 || dist_mm > (uint16_t)MOUNT_HEIGHT_MM) {
    return;   // skip this sample
  }

  float height_mm = MOUNT_HEIGHT_MM - (float)dist_mm;

  // Reject implausible computed heights (< 0.5 m or > 2.5 m)
  if (height_mm < (float)HEIGHT_MIN_MM || height_mm > (float)HEIGHT_MAX_MM) {
    return;
  }

  heightSum_mm += height_mm;
  heightSampleCount++;

  int progress = (heightSampleCount * 100) / HEIGHT_SAMPLES;

  {
    StaticJsonDocument<96> p;
    p["type"]     = "progress";
    p["sensor"]   = "height";
    p["progress"] = progress;
    emitJson(p);
  }

  if (heightSampleCount >= HEIGHT_SAMPLES) {
    float avg_mm = heightSum_mm / (float)HEIGHT_SAMPLES;
    // Convert to metres and round to 2 decimal places (e.g. 1.72)
    float avg_m  = roundf((avg_mm / 1000.0f) * 100.0f) / 100.0f;

    StaticJsonDocument<96> r;
    r["type"]   = "reading";
    r["sensor"] = "height";
    r["value"]  = serialized(String(avg_m, 2));
    emitJson(r);

    state             = IDLE;
    heightSampleCount = 0;
    heightSum_mm      = 0.0f;
  }
}

// ─── Weight measurement (HX711 load-cell ADC) ────────────────────────────────
//
//  Takes WEIGHT_SAMPLES readings every WEIGHT_SAMPLE_INTERVAL ms, averages
//  them, and emits the result in kg rounded to one decimal place.
//
void weightMeasureLoop() {
  // If the HX711 disappears mid-read, abort and report an error.
  if (!scale.is_ready()) return;   // data not ready yet — come back next loop tick

  unsigned long now = millis();
  if (lastWeightSample != 0 && (now - lastWeightSample) < WEIGHT_SAMPLE_INTERVAL) return;
  lastWeightSample = now;

  // get_units(3) averages 3 ADC reads per sample to reduce noise.
  float kg = scale.get_units(3);
  if (kg < 0.0f) kg = 0.0f;   // clamp: negative = noise with nothing on scale

  weightSum += kg;
  weightSampleCount++;

  int progress = (weightSampleCount * 100) / WEIGHT_SAMPLES;
  {
    StaticJsonDocument<128> p;
    p["type"]     = "progress";
    p["sensor"]   = "weight";
    p["progress"] = progress;
    p["value"]    = serialized(String(kg, 1));   // live reading for the UI
    emitJson(p);
  }

  if (weightSampleCount >= WEIGHT_SAMPLES) {
    float avg = weightSum / (float)WEIGHT_SAMPLES;
    avg = roundf(avg * 10.0f) / 10.0f;   // one decimal place (e.g. 72.5)

    StaticJsonDocument<96> r;
    r["type"]   = "reading";
    r["sensor"] = "weight";
    r["value"]  = serialized(String(avg, 1));
    emitJson(r);

    state             = IDLE;
    weightSampleCount = 0;
    weightSum         = 0.0f;
  }
}
