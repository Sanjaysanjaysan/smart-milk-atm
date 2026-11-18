/*
 * ===================================================================================
 * SMART MILK ATM — ESP32 DEVKIT V1 FIRMWARE (1-CHANNEL ACTIVE-LOW RELAY + 12V PUMP)
 * ===================================================================================
 * Exact Backend Compatibility: server.ts (Smart Milk ATM Express Backend)
 * Hardware Setup (Bench / Water Demo):
 *   - Board         : ESP32 DevKit V1 (ESP-WROOM-32)
 *   - Relay Module  : 1-Channel Relay (IN -> GPIO 26, Active-LOW logic)
 *   - Actuator      : 12V DC Water Pump + 12V DC Power Supply
 *   - E-Stop Input  : Built-in ESP32 BOOT button (GPIO 0, Active-LOW) + Server/Serial E-Stop
 *
 * Arduino IDE Setup:
 *   - Board Manager : "esp32" by Espressif Systems (v2.0+ or v3.x) -> "DOIT ESP32 DEVKIT V1"
 *   - Libraries     : WiFi (built-in), HTTPClient (built-in), ArduinoJson (Benoit Blanchon v6 or v7)
 *   - Serial Monitor: 115200 baud (Type "STOP" for E-Stop or "RESET" to clear local E-Stop)
 *
 * Security Notice:
 *   - Set DEVICE_AUTH_SECRET below to match backend .env DEVICE_AUTH_SECRET.
 *   - Never commit or expose real DEVICE_AUTH_SECRET in frontend website files.
 * ===================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// -----------------------------------------------------------------------------------
// 1. HARDWARE PIN & RELAY LOGIC CONFIGURATION
// -----------------------------------------------------------------------------------
#define PIN_RELAY_PUMP       26    // Relay IN connected to GPIO 26
#define PIN_EMERGENCY_BTN     0    // Built-in BOOT button on ESP32 DevKit V1 (Active LOW)
#define PIN_LED_STATUS        2    // Built-in blue LED on ESP32 DevKit V1

// Active-LOW relay module: LOW turns pump ON, HIGH turns pump OFF
const bool RELAY_ACTIVE_LOW = true;

// -----------------------------------------------------------------------------------
// 2. LOCAL WI-FI & EXPRESS BACKEND CONFIGURATION
// -----------------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_LOCAL_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_LOCAL_WIFI_PASSWORD";

// Your laptop/PC local LAN IP running Express server.ts on port 3000
// Find on Windows: `ipconfig` (IPv4 Address) | Mac/Linux: `ip addr` or `ifconfig`
// Example: "http://192.168.1.25:3000" (Use http:// on local LAN; NEVER localhost on ESP32)
const char* BACKEND_BASE_URL = "http://192.168.1.100:3000";

// Must match server.ts DEFAULT_MACHINE_ID and DEVICE_AUTH_SECRET in backend environment
const char* MACHINE_ID         = "ATM-KA-001";
const char* DEVICE_AUTH_SECRET = "REPLACE_WITH_BACKEND_DEVICE_AUTH_SECRET";
const char* FIRMWARE_VERSION   = "v2.6.0-esp32-devkitv1-relay26";

// -----------------------------------------------------------------------------------
// 3. DEMO CALIBRATION & FAILSAFE PARAMETERS (Matched to server.ts)
// -----------------------------------------------------------------------------------
// server.ts demo calibration:
//   250 ml ->  5000 ms (5s)
//   500 ml -> 10000 ms (10s)
//   750 ml -> 15000 ms (15s)
//  1000 ml -> 20000 ms (20s)
// Failsafe max runtime in server.ts: 25000 ms (25s)
const unsigned long HARD_MAX_PUMP_TIMEOUT_MS = 25000UL;
const unsigned long HEARTBEAT_INTERVAL_MS    = 10000UL;
const unsigned long CLAIM_POLL_INTERVAL_MS   = 2500UL;
const unsigned long TELEMETRY_INTERVAL_MS    = 1000UL;
const unsigned long WIFI_RETRY_INTERVAL_MS   = 5000UL;
const unsigned long HTTP_TIMEOUT_MS          = 5000UL;

// Duplicate Command Protection Ring Buffer
const int MAX_PROCESSED_JOBS = 16;
String processedJobIds[MAX_PROCESSED_JOBS];
String processedTokens[MAX_PROCESSED_JOBS];
int processedWriteIndex = 0;

// -----------------------------------------------------------------------------------
// 4. STATE MACHINE & RUNTIME STATE
// -----------------------------------------------------------------------------------
enum MachineState {
  STATE_READY,
  STATE_DISPENSING,
  STATE_PENDING_COMPLETION_SYNC,
  STATE_EMERGENCY_STOP
};

MachineState currentState = STATE_READY;
bool serverEmergencyActive = false;
bool localEmergencyActive  = false;

// Active Job Variables
String currentJobId           = "";
String currentOrderId         = "";
String currentDispensingToken = "";
int    targetQuantityMl       = 0;
unsigned long targetRunTimeMs     = 0;
unsigned long effectiveMaxRunMs   = HARD_MAX_PUMP_TIMEOUT_MS;
unsigned long dispensingStartTime = 0;
unsigned long completedActualMs   = 0;
int           completedVolumeMl   = 0;

// Non-blocking Timers
unsigned long lastHeartbeatTime = 0;
unsigned long lastClaimPollTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastWifiRetryTime = 0;
bool backendRegistered          = false;

// -----------------------------------------------------------------------------------
// 5. HARDWARE RELAY CONTROL (OFF BY DEFAULT)
// -----------------------------------------------------------------------------------
void setPump(bool enable) {
  if (enable) {
    digitalWrite(PIN_RELAY_PUMP, RELAY_ACTIVE_LOW ? LOW : HIGH);
    digitalWrite(PIN_LED_STATUS, HIGH);
  } else {
    digitalWrite(PIN_RELAY_PUMP, RELAY_ACTIVE_LOW ? HIGH : LOW);
    digitalWrite(PIN_LED_STATUS, LOW);
  }
}

void triggerEmergencyStop(const char* source) {
  setPump(false);
  currentState = STATE_EMERGENCY_STOP;
  Serial.println("\n[!!!] EMERGENCY STOP ACTIVATED (" + String(source) + ") — GPIO 26 Relay FORCED OFF");
}

// -----------------------------------------------------------------------------------
// 6. CALIBRATION & DUPLICATE PROTECTION HELPERS
// -----------------------------------------------------------------------------------
bool isSupportedQuantity(int qtyMl) {
  return (qtyMl == 250 || qtyMl == 500 || qtyMl == 750 || qtyMl == 1000);
}

unsigned long getDefaultDemoRuntimeMs(int qtyMl) {
  switch (qtyMl) {
    case 250:  return 5000UL;
    case 500:  return 10000UL;
    case 750:  return 15000UL;
    case 1000: return 20000UL;
    default:   return 0UL;
  }
}

bool isDuplicateJobOrToken(const String& jobId, const String& token) {
  if (jobId.length() == 0 || token.length() == 0) return true;
  if (jobId == currentJobId || token == currentDispensingToken) return true;

  for (int i = 0; i < MAX_PROCESSED_JOBS; i++) {
    if (processedJobIds[i] == jobId || processedTokens[i] == token) {
      return true;
    }
  }
  return false;
}

void recordProcessedJob(const String& jobId, const String& token) {
  processedJobIds[processedWriteIndex] = jobId;
  processedTokens[processedWriteIndex] = token;
  processedWriteIndex = (processedWriteIndex + 1) % MAX_PROCESSED_JOBS;
}

// -----------------------------------------------------------------------------------
// 7. WI-FI CONNECTION & AUTO-RECONNECT
// -----------------------------------------------------------------------------------
void connectWiFiBlocking(unsigned long maxWaitMs) {
  Serial.printf("[WiFi] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < maxWaitMs) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected! ESP32 IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("[WiFi] Initial connection timed out. Will auto-retry in background loop.");
  }
}

void maintainWiFiConnection(unsigned long now) {
  if (WiFi.status() == WL_CONNECTED) return;

  if (now - lastWifiRetryTime >= WIFI_RETRY_INTERVAL_MS) {
    lastWifiRetryTime = now;
    Serial.println("[WiFi] Disconnected! Attempting automatic reconnection...");
    WiFi.disconnect(false, false);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// -----------------------------------------------------------------------------------
// 8. EXACT EXPRESS BACKEND API CLIENTS (MATCHED TO server.ts)
// -----------------------------------------------------------------------------------

// 8A. Verify Machine Registration & Config via GET /api/devices/:deviceId/status
bool verifyDeviceStatusEndpoint() {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/status";
  http.begin(url);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<768> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err) {
      const char* mId = doc["machine"]["machineId"] | "UNKNOWN";
      const char* mStatus = doc["machine"]["status"] | "UNKNOWN";
      int rPin = doc["machine"]["relayPin"] | 26;
      bool activeLow = doc["machine"]["relayActiveLow"] | true;
      unsigned long srvMaxMs = doc["machine"]["maxRuntimeMs"] | HARD_MAX_PUMP_TIMEOUT_MS;
      Serial.printf("[Backend] Device verified: %s | Status: %s | Relay GPIO: %d (Active-LOW: %s) | MaxRuntime: %lu ms\n",
                    mId, mStatus, rPin, activeLow ? "true" : "false", srvMaxMs);
      http.end();
      return true;
    }
  } else {
    Serial.printf("[Backend] GET /status failed (HTTP %d). Check BACKEND_BASE_URL & laptop firewall.\n", httpCode);
  }
  http.end();
  return false;
}

// 8B. Authenticated Heartbeat / Registration via POST /api/devices/:deviceId/heartbeat
bool sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);

  StaticJsonDocument<256> reqDoc;
  if (currentState == STATE_EMERGENCY_STOP) {
    reqDoc["status"] = "EMERGENCY_STOP";
  } else if (currentState == STATE_DISPENSING) {
    reqDoc["status"] = "DISPENSING";
  } else {
    reqDoc["status"] = "READY";
  }
  reqDoc["ipAddress"] = WiFi.localIP().toString();
  reqDoc["firmwareVersion"] = FIRMWARE_VERSION;

  String body;
  serializeJson(reqDoc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    String resp = http.getString();
    StaticJsonDocument<256> respDoc;
    DeserializationError err = deserializeJson(respDoc, resp);
    if (!err && respDoc["acknowledged"].as<bool>()) {
      backendRegistered = true;
      bool srvEStop = respDoc["emergencyStop"] | false;
      float stockL = respDoc["currentStockLiters"] | -1.0f;

      if (srvEStop && currentState != STATE_EMERGENCY_STOP) {
        serverEmergencyActive = true;
        triggerEmergencyStop("Server E-Stop via Heartbeat");
      } else if (!srvEStop && serverEmergencyActive && !localEmergencyActive && currentState == STATE_EMERGENCY_STOP) {
        serverEmergencyActive = false;
        currentState = STATE_READY;
        setPump(false);
        Serial.println("[Backend] Server Emergency Stop cleared -> Returned to STATE_READY");
      }

      Serial.printf("[Heartbeat] ACK OK | Stock: %.2f L | E-Stop: %s\n",
                    stockL, srvEStop ? "ACTIVE" : "CLEAR");
      http.end();
      return true;
    }
  } else if (httpCode == 401) {
    Serial.println("[AUTH ERROR] HTTP 401 on /heartbeat — DEVICE_AUTH_SECRET mismatch!");
  } else {
    Serial.printf("[Heartbeat] HTTP error: %d\n", httpCode);
  }

  http.end();
  return false;
}

// 8C. Poll & Claim Authorized Job via POST /api/devices/:deviceId/dispensing/claim
bool claimDispensingJob() {
  if (WiFi.status() != WL_CONNECTED || currentState != STATE_READY) return false;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/dispensing/claim";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);

  int httpCode = http.POST("{}");
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<640> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (error) {
      Serial.printf("[Claim] JSON parse error: %s\n", error.c_str());
      http.end();
      return false;
    }

    if (!doc["hasJob"].as<bool>()) {
      http.end();
      return false;
    }

    String jobId = doc["jobId"] | "";
    String orderId = doc["orderId"] | "";
    String token = doc["dispensingToken"] | "";
    int qtyMl = doc["quantityMl"] | 0;
    unsigned long srvTargetMs = doc["targetRunTimeMs"] | 0UL;
    unsigned long srvMaxMs = doc["maxRuntimeMs"] | HARD_MAX_PUMP_TIMEOUT_MS;

    // Validate Authorization Token & Guard Against Duplicates
    if (isDuplicateJobOrToken(jobId, token)) {
      Serial.printf("[SECURITY] Rejected duplicate or invalid dispensing command (Job: %s)\n", jobId.c_str());
      http.end();
      return false;
    }

    // Validate Supported Water-Demo Milk Quantities
    if (!isSupportedQuantity(qtyMl)) {
      Serial.printf("[SAFETY] Unsupported quantity %d ml received for Job %s — Reporting failure.\n", qtyMl, jobId.c_str());
      http.end();
      currentJobId = jobId;
      currentDispensingToken = token;
      reportDispenseFailure("Unsupported quantity for water demo", 0);
      return false;
    }

    unsigned long calibratedMs = (srvTargetMs > 0) ? srvTargetMs : getDefaultDemoRuntimeMs(qtyMl);
    unsigned long safeMaxMs = (srvMaxMs > 0 && srvMaxMs <= HARD_MAX_PUMP_TIMEOUT_MS) ? srvMaxMs : HARD_MAX_PUMP_TIMEOUT_MS;

    if (calibratedMs > safeMaxMs) {
      Serial.printf("[SAFETY] Target runtime (%lu ms) exceeds max safety limit (%lu ms) — Clamping.\n", calibratedMs, safeMaxMs);
      calibratedMs = safeMaxMs;
    }

    currentJobId           = jobId;
    currentOrderId         = orderId;
    currentDispensingToken = token;
    targetQuantityMl       = qtyMl;
    targetRunTimeMs        = calibratedMs;
    effectiveMaxRunMs      = safeMaxMs;

    Serial.println("\n------------------------------------------");
    Serial.printf("[AUTHORIZED CLAIM] Job: %s | Order: %s\n", currentJobId.c_str(), currentOrderId.c_str());
    Serial.printf("  Quantity       : %d ml\n", targetQuantityMl);
    Serial.printf("  Demo Calibration: %lu ms (Max Cutoff: %lu ms)\n", targetRunTimeMs, effectiveMaxRunMs);
    Serial.println("  Relay Action   : GPIO 26 -> LOW (12V Water Pump ON)");
    Serial.println("------------------------------------------");

    http.end();
    return true;
  } else if (httpCode == 423) {
    serverEmergencyActive = true;
    triggerEmergencyStop("Backend returned HTTP 423 E-Stop");
  } else if (httpCode == 401) {
    Serial.println("[AUTH ERROR] HTTP 401 on /claim — Check DEVICE_AUTH_SECRET!");
  } else if (httpCode < 0) {
    Serial.printf("[Claim] Backend unreachable (%s)\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return false;
}

// 8D. Stream Telemetry & Poll Server E-Stop via POST /api/devices/:deviceId/dispensing/telemetry
bool sendTelemetry(int dispensedMl, bool pumpRunning) {
  if (WiFi.status() != WL_CONNECTED) return true; // Keep local safety timer running even if Wi-Fi blips

  HTTPClient http;
  http.setTimeout(2500); // Fast timeout so loop timing stays accurate
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/dispensing/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);

  StaticJsonDocument<256> doc;
  doc["jobId"]           = currentJobId;
  doc["dispensingToken"] = currentDispensingToken;
  doc["dispensedMl"]     = dispensedMl;
  doc["pulsesCounted"]   = 0; // Time-calibrated bench water setup (no flow sensor attached)
  doc["pumpRunning"]     = pumpRunning;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    String resp = http.getString();
    StaticJsonDocument<256> respDoc;
    if (!deserializeJson(respDoc, resp)) {
      bool srvEStop = respDoc["emergencyStop"] | false;
      String cmd = respDoc["pumpCommand"] | "CONTINUE";
      if (srvEStop || cmd == "STOP") {
        http.end();
        return false; // Signal immediate pump shutdown!
      }
    }
  }
  http.end();
  return true;
}

// 8E. Report Completion via POST /api/devices/:deviceId/dispensing/complete
bool postCompletionReport(int dispensedMl, unsigned long actualRunTimeMs) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/dispensing/complete";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);

  StaticJsonDocument<256> doc;
  doc["jobId"]           = currentJobId;
  doc["dispensingToken"] = currentDispensingToken;
  doc["dispensedMl"]     = dispensedMl;
  doc["actualRunTimeMs"] = actualRunTimeMs;
  doc["pulsesCounted"]   = 0; // Server marks measurementType = TIME_ESTIMATED

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    Serial.printf("[COMPLETE ACK] Job %s finished (%d ml in %lu ms) confirmed by backend.\n",
                  currentJobId.c_str(), dispensedMl, actualRunTimeMs);
    recordProcessedJob(currentJobId, currentDispensingToken);
    http.end();
    return true;
  }

  Serial.printf("[COMPLETE WARN] Backend returned HTTP %d — will retry.\n", httpCode);
  http.end();
  return false;
}

// 8F. Report Failure via POST /api/devices/:deviceId/dispensing/fail
void reportDispenseFailure(const char* reason, int dispensedMl) {
  setPump(false);
  Serial.printf("[FAILURE] Job %s halted: %s (GPIO 26 Relay OFF)\n", currentJobId.c_str(), reason);

  if (WiFi.status() == WL_CONNECTED && currentJobId.length() > 0 && currentDispensingToken.length() > 0) {
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    String url = String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/dispensing/fail";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);

    StaticJsonDocument<256> doc;
    doc["jobId"]           = currentJobId;
    doc["dispensingToken"] = currentDispensingToken;
    doc["failureReason"]   = reason;
    doc["dispensedMl"]     = dispensedMl; // 0 prevents deducting failed demo stock
    doc["pulsesCounted"]   = 0;

    String body;
    serializeJson(doc, body);
    int httpCode = http.POST(body);
    Serial.printf("[FAIL REPORT] Backend HTTP %d\n", httpCode);
    http.end();
  }

  recordProcessedJob(currentJobId, currentDispensingToken);
  currentJobId = "";
  currentOrderId = "";
  currentDispensingToken = "";
}

// -----------------------------------------------------------------------------------
// 9. SETUP & SERIAL COMMAND HANDLER
// -----------------------------------------------------------------------------------
void handleSerialAndButtonInputs() {
  // Check onboard BOOT button (GPIO 0, Active LOW) as physical Emergency Stop
  if (digitalRead(PIN_EMERGENCY_BTN) == LOW && currentState != STATE_EMERGENCY_STOP) {
    delay(30); // Simple debounce
    if (digitalRead(PIN_EMERGENCY_BTN) == LOW) {
      localEmergencyActive = true;
      if (currentState == STATE_DISPENSING) {
        reportDispenseFailure("Local ESP32 Emergency Button pressed", 0);
      }
      triggerEmergencyStop("Onboard BOOT Button (GPIO 0)");
    }
  }

  // Serial Monitor commands for quick bench testing
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();
    if (cmd == "STOP" || cmd == "ESTOP") {
      localEmergencyActive = true;
      if (currentState == STATE_DISPENSING) {
        reportDispenseFailure("Serial Monitor Emergency Stop command", 0);
      }
      triggerEmergencyStop("Serial Command STOP");
    } else if (cmd == "RESET") {
      localEmergencyActive = false;
      serverEmergencyActive = false;
      setPump(false);
      currentState = STATE_READY;
      Serial.println("[Serial] Emergency Stop cleared locally -> STATE_READY (Relay OFF)");
    }
  }
}

void setup() {
  // CRITICAL FAILSAFE FIRST: Latch Active-LOW relay pin HIGH (OFF) BEFORE setting OUTPUT mode
  // Prevents a brief relay click / pump pulse during ESP32 power-on or reset.
  digitalWrite(PIN_RELAY_PUMP, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  setPump(false);

  pinMode(PIN_LED_STATUS, OUTPUT);
  digitalWrite(PIN_LED_STATUS, LOW);
  pinMode(PIN_EMERGENCY_BTN, INPUT_PULLUP);

  Serial.begin(115200);
  delay(200);
  Serial.println("\n====================================================");
  Serial.println("   SMART MILK ATM — ESP32 DEVKIT V1 RELAY CONTROLLER");
  Serial.println("====================================================");
  Serial.printf("Machine ID   : %s\n", MACHINE_ID);
  Serial.printf("Backend URL  : %s\n", BACKEND_BASE_URL);
  Serial.printf("Relay GPIO   : %d (Active-LOW, Default: OFF/HIGH)\n", PIN_RELAY_PUMP);
  Serial.printf("Max Runtime  : %lu ms Failsafe Cutoff\n", HARD_MAX_PUMP_TIMEOUT_MS);

  connectWiFiBlocking(15000UL);

  if (WiFi.status() == WL_CONNECTED) {
    verifyDeviceStatusEndpoint();
    sendHeartbeat();
  }

  lastHeartbeatTime = millis();
  lastClaimPollTime = millis();
  Serial.println("[System] Setup complete. Relay is OFF. Waiting for authorized payment jobs...");
}

// -----------------------------------------------------------------------------------
// 10. MAIN NON-BLOCKING CONTROL LOOP
// -----------------------------------------------------------------------------------
void loop() {
  unsigned long now = millis();

  // Always check emergency stop inputs & maintain Wi-Fi connectivity
  handleSerialAndButtonInputs();
  maintainWiFiConnection(now);

  // Periodic Heartbeat every 10 seconds (matches server.ts 45s offline watchdog)
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = now;
    if (WiFi.status() == WL_CONNECTED) {
      if (!backendRegistered) {
        verifyDeviceStatusEndpoint();
      }
      sendHeartbeat();
    }
  }

  switch (currentState) {
    case STATE_READY: {
      setPump(false);
      if (now - lastClaimPollTime >= CLAIM_POLL_INTERVAL_MS) {
        lastClaimPollTime = now;
        if (claimDispensingJob()) {
          currentState = STATE_DISPENSING;
          dispensingStartTime = millis();
          lastTelemetryTime   = dispensingStartTime;
          setPump(true); // Activate GPIO 26 LOW -> 12V Water Pump ON
        }
      }
      break;
    }

    case STATE_DISPENSING: {
      unsigned long elapsed = now - dispensingStartTime;

      // Safety Check 1: Absolute Maximum Pump Runtime Failsafe
      if (elapsed >= HARD_MAX_PUMP_TIMEOUT_MS || elapsed > effectiveMaxRunMs + 500UL) {
        setPump(false);
        reportDispenseFailure("Max pump runtime failsafe exceeded", 0);
        currentState = STATE_READY;
        break;
      }

      // Compute proportional volume for telemetry & Serial progress
      int estDispensedMl = (targetRunTimeMs > 0)
        ? (int)min((unsigned long)targetQuantityMl, (elapsed * (unsigned long)targetQuantityMl) / targetRunTimeMs)
        : 0;

      // Print clean progress every 1000ms & stream telemetry to server
      if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryTime = now;
        int pct = constrain((int)((elapsed * 100UL) / targetRunTimeMs), 0, 100);
        Serial.printf("[Dispensing] %s | %d / %d ml (%d%%) | %lu / %lu ms\n",
                      currentJobId.c_str(), estDispensedMl, targetQuantityMl, pct, elapsed, targetRunTimeMs);

        if (!sendTelemetry(estDispensedMl, true)) {
          // Server issued Emergency Stop mid-dispense!
          setPump(false);
          serverEmergencyActive = true;
          reportDispenseFailure("Server Emergency Stop triggered mid-dispense", 0);
          triggerEmergencyStop("Server Telemetry STOP");
          break;
        }
      }

      // Check Calibrated Target Completion
      if (elapsed >= targetRunTimeMs) {
        setPump(false); // Immediately shut off GPIO 26!
        completedActualMs = elapsed;
        completedVolumeMl = targetQuantityMl;
        Serial.printf("[Relay OFF] Target reached (%lu ms). Reporting completion...\n", completedActualMs);

        if (postCompletionReport(completedVolumeMl, completedActualMs)) {
          currentJobId = "";
          currentOrderId = "";
          currentDispensingToken = "";
          currentState = STATE_READY;
        } else {
          currentState = STATE_PENDING_COMPLETION_SYNC;
        }
      }
      break;
    }

    case STATE_PENDING_COMPLETION_SYNC: {
      setPump(false);
      static unsigned long lastSyncRetry = 0;
      if (now - lastSyncRetry >= 3000UL) {
        lastSyncRetry = now;
        if (WiFi.status() == WL_CONNECTED && postCompletionReport(completedVolumeMl, completedActualMs)) {
          currentJobId = "";
          currentOrderId = "";
          currentDispensingToken = "";
          currentState = STATE_READY;
        }
      }
      break;
    }

    case STATE_EMERGENCY_STOP: {
      setPump(false); // Enforce relay strictly OFF
      break;
    }
  }
}
