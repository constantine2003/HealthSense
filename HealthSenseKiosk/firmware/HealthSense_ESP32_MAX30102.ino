/*
 * HealthSense ESP32 with MAX30102 Sensor
 * NodeMCU ESP32S - Heart Rate & SpO2 Measurement
 *
 * This firmware reads real data from MAX30102 sensor and communicates via Serial.
 *
 * Hardware:
 * - ESP32 NodeMCU-32S
 * - MAX30102 Heart Rate & Blood Oxygen Sensor
 *
 * Wiring:
 * - MAX30102 VIN → ESP32 3.3V
 * - MAX30102 GND → ESP32 GND
 * - MAX30102 SDA → ESP32 GPIO 21
 * - MAX30102 SCL → ESP32 GPIO 22
 *
 * Required Library:
 * - SparkFun MAX3010x Pulse and Proximity Sensor Library
 */

#include <Wire.h>
#include <ArduinoJson.h>
#include "MAX30105.h"
#include "heartRate.h"

// ============================================================================
// Configuration
// ============================================================================

const char* DEVICE_ID = "ESP32-MAX30102-001";
const char* FIRMWARE_VERSION = "1.0.0-max30102";

// MAX30102 sensor
MAX30105 particleSensor;

// Heart rate calculation
const byte RATE_SIZE = 4; // Increase for more averaging. 4 is good.
byte rates[RATE_SIZE]; // Array of heart rates
byte rateSpot = 0;
long lastBeat = 0; // Time at which the last beat occurred

float beatsPerMinute;
int beatAvg;
int spo2Value = 0;

// ============================================================================
// Global State
// ============================================================================

struct MeasurementState {
  bool isActive;
  String type;
  String measurementId;
  String patientId;
  float heartRate;
  int spO2;
  int progress; // 0-100
  unsigned long startTime;
  unsigned long duration;
};

MeasurementState currentMeasurement = {false, "", "", "", 0.0, 0, 0, 0, 0};

// Sensor availability (will be updated after detection)
struct SensorStatus {
  bool temperature = false;
  bool heartRate = false;  // Will be set to true if MAX30102 detected
  bool spO2 = false;       // Will be set to true if MAX30102 detected
  bool bloodPressure = false;
  bool height = false;
  bool weight = false;
};

SensorStatus sensors;
bool max30102Detected = false; // Track if sensor is actually connected

// ============================================================================
// Helper Functions
// ============================================================================

void sendJson(const JsonDocument& doc) {
  serializeJson(doc, Serial);
  Serial.println();
}

String generateMeasurementId() {
  return "MEAS-" + String(millis());
}

// Simulate other sensors (temperature, weight, etc.)
float simulateOtherSensors(String type) {
  if (type == "temperature") {
    return random(360, 380) / 10.0;
  } else if (type == "weight") {
    return random(500, 1000) / 10.0;
  } else if (type == "height") {
    return random(150, 190);
  } else if (type == "bloodPressure") {
    return random(110, 130);
  }
  return 0.0;
}

// ============================================================================
// MAX30102 Functions
// ============================================================================

bool initMAX30102() {
  Serial.println("\n🔍 Checking MAX30102 sensor...");

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("❌ MAX30102 not detected!");
    Serial.println("   Please check wiring:");
    Serial.println("   - VIN → 3.3V (or external power)");
    Serial.println("   - GND → GND");
    Serial.println("   - SDA → GPIO 21");
    Serial.println("   - SCL → GPIO 22");
    return false;
  }

  Serial.println("✅ MAX30102 detected!");

  // Configure sensor - NORMAL POWER MODE (using external power supply)
  byte ledBrightness = 60; // Options: 0=Off to 255=50mA
  byte sampleAverage = 4; // Options: 1, 2, 4, 8, 16, 32
  byte ledMode = 2; // Options: 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green
  byte sampleRate = 100; // Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
  int pulseWidth = 411; // Options: 69, 118, 215, 411
  int adcRange = 4096; // Options: 2048, 4096, 8192, 16384

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeRed(0x0A); // Turn Red LED to low to indicate sensor is running
  particleSensor.setPulseAmplitudeGreen(0); // Turn off Green LED

  Serial.println("📊 Heart Rate/SpO2 sensor ready");
  return true;
}

void readHeartRateAndSpO2() {
  long irValue = particleSensor.getIR();

  // Check if finger is detected
  if (irValue < 50000) {
    // No finger detected
    currentMeasurement.heartRate = 0;
    currentMeasurement.spO2 = 0;
    return;
  }

  // Heart Rate Calculation
  if (checkForBeat(irValue) == true) {
    // We sensed a beat!
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute; // Store this reading
      rateSpot %= RATE_SIZE; // Wrap variable

      // Take average of readings
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++)
        beatAvg += rates[x];
      beatAvg /= RATE_SIZE;

      currentMeasurement.heartRate = beatAvg;
    }
  }

  // SpO2 Calculation (simplified)
  // For accurate SpO2, you need more complex algorithms
  // This is a simplified estimation
  long redValue = particleSensor.getRed();

  if (irValue > 0 && redValue > 0) {
    float ratio = (float)redValue / (float)irValue;

    // Simplified SpO2 estimation
    // Actual SpO2 requires calibration and complex algorithms
    if (ratio > 0.5 && ratio < 1.0) {
      spo2Value = map(ratio * 100, 50, 100, 95, 100);
      spo2Value = constrain(spo2Value, 90, 100);
      currentMeasurement.spO2 = spo2Value;
    }
  }

  // Debug output
  Serial.print("❤️  HR: ");
  Serial.print(currentMeasurement.heartRate);
  Serial.print(" BPM | 🩸 SpO2: ");
  Serial.print(currentMeasurement.spO2);
  Serial.println("%");
}

// ============================================================================
// Command Handlers
// ============================================================================

void handlePing() {
  StaticJsonDocument<128> doc;
  doc["type"] = "pong";
  doc["timestamp"] = millis();
  sendJson(doc);
}

void handleGetDeviceInfo() {
  StaticJsonDocument<512> doc;
  doc["type"] = "deviceInfo";

  JsonObject payload = doc.createNestedObject("payload");
  payload["firmwareVersion"] = FIRMWARE_VERSION;
  payload["deviceId"] = DEVICE_ID;
  payload["lastCalibration"] = nullptr;

  JsonObject sensorObj = payload.createNestedObject("sensors");
  sensorObj["temperature"] = sensors.temperature;
  sensorObj["heartRate"] = sensors.heartRate;
  sensorObj["spO2"] = sensors.spO2;
  sensorObj["bloodPressure"] = sensors.bloodPressure;
  sensorObj["height"] = sensors.height;
  sensorObj["weight"] = sensors.weight;

  sendJson(doc);
}

void handleStartMeasurement(JsonDocument& cmd) {
  String type = cmd["type"].as<String>();
  String patientId = cmd["patientId"] | "";
  String measurementId = cmd["measurementId"] | generateMeasurementId();

  // Initialize measurement
  currentMeasurement.isActive = true;
  currentMeasurement.type = type;
  currentMeasurement.measurementId = measurementId;
  currentMeasurement.patientId = patientId;
  currentMeasurement.heartRate = 0.0;
  currentMeasurement.spO2 = 0;
  currentMeasurement.progress = 0;
  currentMeasurement.startTime = millis();
  currentMeasurement.duration = 10000; // 10 seconds for HR/SpO2

  Serial.print("DEBUG: Started measurement - Type: ");
  Serial.print(type);
  Serial.print(", ID: ");
  Serial.println(measurementId);

  // Send confirmation
  StaticJsonDocument<256> doc;
  doc["type"] = "measurementStarted";
  JsonObject payload = doc.createNestedObject("payload");
  payload["measurementId"] = measurementId;
  payload["type"] = type;
  sendJson(doc);
}

void handleStopMeasurement() {
  currentMeasurement.isActive = false;
  currentMeasurement.progress = 0;

  Serial.println("DEBUG: Measurement stopped");

  StaticJsonDocument<128> doc;
  doc["type"] = "measurementStopped";
  sendJson(doc);
}

// ============================================================================
// Serial Command Processing
// ============================================================================

void processCommand(const String& line) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, line);

  if (error) {
    Serial.print("DEBUG: JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  String action = doc["action"].as<String>();

  if (action == "ping") {
    handlePing();
  }
  else if (action == "getDeviceInfo") {
    handleGetDeviceInfo();
  }
  else if (action == "startMeasurement") {
    handleStartMeasurement(doc);
  }
  else if (action == "stopMeasurement") {
    handleStopMeasurement();
  }
  else {
    Serial.print("DEBUG: Unknown action: ");
    Serial.println(action);
  }
}

// ============================================================================
// Measurement Updates
// ============================================================================

void updateMeasurement() {
  if (!currentMeasurement.isActive) return;

  unsigned long elapsed = millis() - currentMeasurement.startTime;
  currentMeasurement.progress = min(100, (int)((elapsed * 100) / currentMeasurement.duration));

  // Read sensor based on measurement type
  if (currentMeasurement.type == "heartRate" || currentMeasurement.type == "heart-rate") {
    // Read from MAX3010...
    readHeartRateAndSpO2();

    // Send heart rate and SpO2 as combined value
    StaticJsonDocument<256> doc;
    doc["type"] = "measurementUpdate";

    JsonObject payload = doc.createNestedObject("payload");
    payload["progress"] = currentMeasurement.progress;

    // Create nested object for HR + SpO2
    JsonObject values = payload.createNestedObject("currentValue");
    values["heartRate"] = currentMeasurement.heartRate;
    values["spO2"] = currentMeasurement.spO2;

    sendJson(doc);
  } else {
    // Simulate other measurements
    float value = simulateOtherSensors(currentMeasurement.type);

    StaticJsonDocument<256> doc;
    doc["type"] = "measurementUpdate";

    JsonObject payload = doc.createNestedObject("payload");
    payload["progress"] = currentMeasurement.progress;
    payload["currentValue"] = value;

    sendJson(doc);
  }

  // Check if complete
  if (currentMeasurement.progress >= 100) {
    StaticJsonDocument<256> completeDoc;
    completeDoc["type"] = "measurementComplete";

    JsonObject completePayload = completeDoc.createNestedObject("payload");

    if (currentMeasurement.type == "heartRate" || currentMeasurement.type == "heart-rate") {
      JsonObject finalValues = completePayload.createNestedObject("finalValue");
      finalValues["heartRate"] = currentMeasurement.heartRate;
      finalValues["spO2"] = currentMeasurement.spO2;
    } else {
      completePayload["finalValue"] = simulateOtherSensors(currentMeasurement.type);
    }

    sendJson(completeDoc);

    currentMeasurement.isActive = false;

    Serial.print("DEBUG: Measurement complete - ");
    Serial.print(currentMeasurement.type);
    if (currentMeasurement.type == "heartRate" || currentMeasurement.type == "heart-rate") {
      Serial.print(" HR: ");
      Serial.print(currentMeasurement.heartRate);
      Serial.print(" BPM, SpO2: ");
      Serial.print(currentMeasurement.spO2);
      Serial.println("%");
    }
  }
}

// ============================================================================
// Setup
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n=================================");
  Serial.println("HealthSense ESP32 (MAX30102)");
  Serial.println("Firmware: " + String(FIRMWARE_VERSION));
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("=================================");

  // Initialize I2C
  Wire.begin();

  // Initialize MAX30102
  if (initMAX30102()) {
    sensors.heartRate = true;
    sensors.spO2 = true;
  } else {
    sensors.heartRate = false;
    sensors.spO2 = false;
  }

  Serial.println("=================================");
  Serial.println("Ready! Listening for commands...");
  Serial.println("Place finger on sensor to test.");
  Serial.println("=================================\n");

  // Send initial device info
  handleGetDeviceInfo();
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
  // Read commands from Serial
  if (Serial.available() > 0) {
    String line = Serial.readStringUntil('\n');
    line.trim();

    if (line.length() > 0) {
      processCommand(line);
    }
  }

  // Update active measurement
  if (currentMeasurement.isActive) {
    static unsigned long lastUpdate = 0;
    if (millis() - lastUpdate > 500) { // Update every 500ms
      updateMeasurement();
      lastUpdate = millis();
    }
  }

  // Periodically send device info updates (every 5 seconds when idle)
  // This ensures the kiosk always has current sensor status
  static unsigned long lastDeviceInfoUpdate = 0;
  if (!currentMeasurement.isActive && millis() - lastDeviceInfoUpdate > 5000) {
    handleGetDeviceInfo();
    lastDeviceInfoUpdate = millis();
  }

  delay(10);
}
