import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cpu,
  Zap,
  Code,
  Copy,
  Check,
  Download,
  Play,
  RotateCcw,
  Radio,
  Layers,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const HardwareHubPage: React.FC = () => {
  const { machine, config, addToast, refreshMachine } = useApp();
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'firmware' | 'wiring' | 'api-docs' | 'simulator'>('wiring');

  // Interactive Simulator State
  const [simClaiming, setSimClaiming] = useState<boolean>(false);
  const [claimedJob, setClaimedJob] = useState<any>(null);
  const [simPulseCount, setSimPulseCount] = useState<number>(0);
  const [simPumpRunning, setSimPumpRunning] = useState<boolean>(false);

  // ESP32 Firmware source code preview (No secret exposed — configure DEVICE_AUTH_SECRET locally in Arduino IDE)
  const firmwareCode = `/*
 * ===================================================================================
 * SMART MILK ATM — ESP32 DEVKIT V1 FIRMWARE (1-CHANNEL ACTIVE-LOW RELAY + 12V PUMP)
 * ===================================================================================
 * Hardware:
 *   - ESP32 DevKit V1 + 1-Channel Active-LOW Relay on GPIO 26 + 12V DC Water Pump
 * Libraries:
 *   - WiFi (Built-in), HTTPClient (Built-in), ArduinoJson (by Benoit Blanchon)
 * ===================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define PIN_RELAY_PUMP     26    // Active-LOW Relay IN -> GPIO 26
#define PIN_EMERGENCY_BTN   0    // Onboard BOOT button (Active LOW)
#define PIN_LED_STATUS      2    // Onboard status LED

const bool RELAY_ACTIVE_LOW = true;

// Replace with your local Wi-Fi credentials & PC LAN IP running server.ts on port 3000
const char* WIFI_SSID          = "YOUR_LOCAL_WIFI_SSID";
const char* WIFI_PASSWORD      = "YOUR_LOCAL_WIFI_PASSWORD";
const char* BACKEND_BASE_URL   = "http://YOUR_PC_LAN_IP:3000";
const char* MACHINE_ID         = "${config.defaultMachineId}";
const char* DEVICE_AUTH_SECRET = "REPLACE_WITH_BACKEND_DEVICE_AUTH_SECRET";
const char* FIRMWARE_VERSION   = "v2.6.0-esp32-devkitv1-relay26";

const unsigned long HARD_MAX_PUMP_TIMEOUT_MS = 25000UL;
const unsigned long HEARTBEAT_INTERVAL_MS    = 10000UL;
const unsigned long CLAIM_POLL_INTERVAL_MS   = 2500UL;
const unsigned long TELEMETRY_INTERVAL_MS    = 1000UL;

const int MAX_PROCESSED_JOBS = 16;
String processedJobIds[MAX_PROCESSED_JOBS];
String processedTokens[MAX_PROCESSED_JOBS];
int processedWriteIndex = 0;

enum MachineState { STATE_READY, STATE_DISPENSING, STATE_EMERGENCY_STOP };
MachineState currentState = STATE_READY;

String currentJobId = "";
String currentDispensingToken = "";
int targetQuantityMl = 0;
unsigned long targetRunTimeMs = 0;
unsigned long dispensingStartTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastClaimPollTime = 0;
unsigned long lastTelemetryTime = 0;

void setPump(bool enable) {
  digitalWrite(PIN_RELAY_PUMP, enable ? (RELAY_ACTIVE_LOW ? LOW : HIGH) : (RELAY_ACTIVE_LOW ? HIGH : LOW));
  digitalWrite(PIN_LED_STATUS, enable ? HIGH : LOW);
}

bool isDuplicateJobOrToken(const String& jobId, const String& token) {
  if (jobId.length() == 0 || token.length() == 0) return true;
  if (jobId == currentJobId || token == currentDispensingToken) return true;
  for (int i = 0; i < MAX_PROCESSED_JOBS; i++) {
    if (processedJobIds[i] == jobId || processedTokens[i] == token) return true;
  }
  return false;
}

void recordProcessedJob(const String& jobId, const String& token) {
  processedJobIds[processedWriteIndex] = jobId;
  processedTokens[processedWriteIndex] = token;
  processedWriteIndex = (processedWriteIndex + 1) % MAX_PROCESSED_JOBS;
}

void setup() {
  digitalWrite(PIN_RELAY_PUMP, RELAY_ACTIVE_LOW ? HIGH : LOW); // Latch OFF before OUTPUT
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  setPump(false);
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_EMERGENCY_BTN, INPUT_PULLUP);

  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("[SMART MILK ATM] Connecting to Wi-Fi...");
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/heartbeat");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);

  StaticJsonDocument<256> doc;
  doc["status"] = (currentState == STATE_EMERGENCY_STOP) ? "EMERGENCY_STOP" : (currentState == STATE_DISPENSING) ? "DISPENSING" : "READY";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  String body;
  serializeJson(doc, body);
  if (http.POST(body) == 200) {
    StaticJsonDocument<256> resp;
    if (!deserializeJson(resp, http.getString()) && (resp["emergencyStop"] | false)) {
      setPump(false);
      currentState = STATE_EMERGENCY_STOP;
    }
  }
  http.end();
}

void pollClaimJob() {
  if (WiFi.status() != WL_CONNECTED || currentState != STATE_READY) return;
  HTTPClient http;
  http.begin(String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/dispensing/claim");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);
  if (http.POST("{}") == 200) {
    StaticJsonDocument<640> doc;
    if (!deserializeJson(doc, http.getString()) && (doc["hasJob"] | false)) {
      String jId = doc["jobId"] | "";
      String tok = doc["dispensingToken"] | "";
      int qty = doc["quantityMl"] | 0;
      unsigned long runMs = doc["targetRunTimeMs"] | 0UL;
      if (!isDuplicateJobOrToken(jId, tok) && (qty == 250 || qty == 500 || qty == 750 || qty == 1000)) {
        currentJobId = jId;
        currentDispensingToken = tok;
        targetQuantityMl = qty;
        targetRunTimeMs = min(runMs > 0 ? runMs : (unsigned long)(qty * 20), HARD_MAX_PUMP_TIMEOUT_MS);
        dispensingStartTime = millis();
        lastTelemetryTime = dispensingStartTime;
        currentState = STATE_DISPENSING;
        setPump(true);
      }
    }
  }
  http.end();
}

void reportComplete(int ml, unsigned long actualMs) {
  setPump(false);
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(BACKEND_BASE_URL) + "/api/devices/" + MACHINE_ID + "/dispensing/complete");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", DEVICE_AUTH_SECRET);
    StaticJsonDocument<256> doc;
    doc["jobId"] = currentJobId;
    doc["dispensingToken"] = currentDispensingToken;
    doc["dispensedMl"] = ml;
    doc["actualRunTimeMs"] = actualMs;
    doc["pulsesCounted"] = 0;
    String body;
    serializeJson(doc, body);
    http.POST(body);
    http.end();
  }
  recordProcessedJob(currentJobId, currentDispensingToken);
  currentJobId = "";
  currentDispensingToken = "";
  currentState = STATE_READY;
}

void loop() {
  unsigned long now = millis();
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); delay(1000); return; }
  if (digitalRead(PIN_EMERGENCY_BTN) == LOW) { setPump(false); currentState = STATE_EMERGENCY_STOP; }
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) { lastHeartbeatTime = now; sendHeartbeat(); }

  if (currentState == STATE_READY && (now - lastClaimPollTime >= CLAIM_POLL_INTERVAL_MS)) {
    lastClaimPollTime = now;
    pollClaimJob();
  } else if (currentState == STATE_DISPENSING) {
    unsigned long elapsed = now - dispensingStartTime;
    if (elapsed >= HARD_MAX_PUMP_TIMEOUT_MS) { setPump(false); currentState = STATE_READY; return; }
    if (elapsed >= targetRunTimeMs) { reportComplete(targetQuantityMl, elapsed); }
  }
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(firmwareCode);
    setCopied(true);
    addToast('success', 'Code Copied', 'ESP32 Arduino C++ firmware copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([firmwareCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart_milk_atm_esp32.ino';
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Download Started', 'smart_milk_atm_esp32.ino saved.');
  };

  // Test Claim API via device simulator
  const handleTestClaim = async () => {
    try {
      setSimClaiming(true);
      const res = await fetch(`/api/devices/${config.defaultMachineId}/dispensing/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Simulator': 'true',
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data.hasJob) {
        setClaimedJob(data);
        setSimPumpRunning(true);
        setSimPulseCount(0);
        addToast('success', 'Dispensing Job Claimed', `Job ${data.jobId} for ${data.quantityMl} ml claimed.`);
      } else {
        addToast('info', 'No Pending Jobs', data.message || 'No orders currently awaiting dispense.');
      }
    } catch (e: any) {
      addToast('error', 'Claim Failed', e.message);
    } finally {
      setSimClaiming(false);
      await refreshMachine();
    }
  };

  // Simulate Complete
  const handleTestComplete = async () => {
    if (!claimedJob) return;
    try {
      const res = await fetch(`/api/devices/${config.defaultMachineId}/dispensing/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Simulator': 'true',
        },
        body: JSON.stringify({
          jobId: claimedJob.jobId,
          dispensingToken: claimedJob.dispensingToken,
          dispensedMl: claimedJob.quantityMl,
          actualRunTimeMs: 10000,
          pulsesCounted: Math.round(claimedJob.quantityMl * 4.5),
        }),
      });

      if (res.ok) {
        addToast('success', 'Dispense Complete', `ESP32 confirmed completion of ${claimedJob.quantityMl} ml.`);
        setClaimedJob(null);
        setSimPumpRunning(false);
        await refreshMachine();
      }
    } catch (e: any) {
      addToast('error', 'Completion Error', e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">
              IoT Engineering Laboratory
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              ESP32 Firmware & Hardware Hub
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Complete pinout schematics, Arduino IDE firmware, and live REST polling simulation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy .ino Code'}
            </button>

            <button
              onClick={handleDownloadCode}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Download .ino
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('wiring')}
            className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'wiring'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            Circuit Wiring Schematic & Pinout
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 text-blue-600" />
            Virtual ESP32 Device Simulator
          </button>

          <button
            onClick={() => setActiveTab('firmware')}
            className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'firmware'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            Arduino IDE Source Code
          </button>

          <button
            onClick={() => setActiveTab('api-docs')}
            className={`pb-3 px-3 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'api-docs'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            ESP32 REST API Reference
          </button>
        </div>

        {/* TAB 1: CIRCUIT WIRING SCHEMATIC */}
        {activeTab === 'wiring' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Wiring Pinout Table */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  ESP32 GPIO Pin Connection Table
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                        <th className="py-2.5">Component</th>
                        <th className="py-2.5">ESP32 Pin</th>
                        <th className="py-2.5">Signal / Logic</th>
                        <th className="py-2.5">Operating Voltage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 font-semibold text-slate-900">1-Channel Relay Module</td>
                        <td className="py-3 font-mono font-bold text-blue-700">GPIO 26</td>
                        <td className="py-3">Digital Output (Configurable Active-LOW)</td>
                        <td className="py-3">5V VCC / 3.3V Logic IN</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-slate-900">12V DC Diaphragm Milk Pump</td>
                        <td className="py-3 font-mono text-slate-600">Relay NO / COM</td>
                        <td className="py-3">Controlled via 12V DC power loop</td>
                        <td className="py-3 font-bold text-amber-700">12V DC External PSU</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-slate-900">YF-S201 Flow Sensor</td>
                        <td className="py-3 font-mono font-bold text-emerald-700">GPIO 27</td>
                        <td className="py-3">Hardware Interrupt (Pulse counter)</td>
                        <td className="py-3">5V (Use resistor divider to 3.3V)</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-slate-900">16x2 I2C LCD Display</td>
                        <td className="py-3 font-mono text-slate-600">SDA=21, SCL=22</td>
                        <td className="py-3">I2C Protocol (Address 0x27)</td>
                        <td className="py-3">5V VCC / 3.3V I2C Bus</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-slate-900">Audible Buzzer</td>
                        <td className="py-3 font-mono text-slate-600">GPIO 25</td>
                        <td className="py-3">Digital Output (Beep notifications)</td>
                        <td className="py-3">3.3V Active Buzzer</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-slate-900">Emergency Stop Pushbutton</td>
                        <td className="py-3 font-mono text-red-700 font-bold">GPIO 33</td>
                        <td className="py-3">Active-LOW Interrupt (Internal Pull-Up)</td>
                        <td className="py-3">GND Switch</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hardware Diagram Box */}
              <div className="lg:col-span-5 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white pb-2 border-b border-slate-800">
                  Architectural Block Flow
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                    <span className="text-cyan-400 font-bold">[ Cloud Backend / API ]</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Captures UPI payment & generates DSP-AUTH token</p>
                  </div>

                  <div className="text-center text-slate-500">▼ HTTP GET / POST (Token Auth)</div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                    <span className="text-emerald-400 font-bold">[ ESP32 Microcontroller ]</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Polls /claim, verifies token, sets GPIO 26 LOW</p>
                  </div>

                  <div className="text-center text-slate-500">▼ 3.3V Logic Trigger</div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                    <span className="text-amber-400 font-bold">[ 1-Channel Relay Module ]</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Closes NO contact, switching 12V circuit</p>
                  </div>

                  <div className="text-center text-slate-500">▼ 12V High Current</div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                    <span className="text-blue-400 font-bold">[ 12V DC Food-Grade Milk Pump ]</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Draws chilled milk from insulated stainless vessel</p>
                  </div>

                  <div className="text-center text-slate-500">▼ Pulse Feedback (GPIO 27)</div>

                  <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-500/40">
                    <span className="text-emerald-300 font-bold">[ YF-S201 Flow Sensor ]</span>
                    <p className="text-emerald-400/80 text-[11px] mt-0.5">Counts 4.5 pulses/ml, triggers auto-stop</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIRTUAL ESP32 SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Interactive ESP32 Polling & Actuation Simulator
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test the machine claim cycle without requiring physical breadboard wiring.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${simPumpRunning ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`} />
                <span className="font-mono text-xs font-bold text-slate-700">
                  {simPumpRunning ? 'RELAY ENERGIZED (PUMP RUNNING)' : 'RELAY DE-ENERGIZED (OFF)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Claim Action */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800">1. Poll & Claim Authorized Dispensing Job</h4>
                <p className="text-slate-600">
                  Simulates the ESP32 calling <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">POST /api/devices/{config.defaultMachineId}/dispensing/claim</code> with device token header.
                </p>
                <button
                  onClick={handleTestClaim}
                  disabled={simClaiming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {simClaiming ? 'Polling Backend...' : 'Simulate ESP32 Claim Job'}
                </button>
              </div>

              {/* Complete Action */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800">2. Confirm Completion via Flow Sensor</h4>
                <p className="text-slate-600">
                  Simulates the ESP32 counting target pulses and calling <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">POST /api/devices/{config.defaultMachineId}/dispensing/complete</code>.
                </p>
                <button
                  onClick={handleTestComplete}
                  disabled={!claimedJob}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Simulate Flow Sensor Target Reached & Stop
                </button>
              </div>
            </div>

            {/* Claimed Job JSON Inspector */}
            {claimedJob && (
              <div className="p-4 bg-slate-900 rounded-2xl text-emerald-400 font-mono text-xs overflow-x-auto space-y-2">
                <div className="text-white font-bold">Active Claimed Job Payload:</div>
                <pre>{JSON.stringify(claimedJob, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FIRMWARE CODE */}
        {activeTab === 'firmware' && (
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-xs text-cyan-400 font-bold">firmware/esp32_smart_milk_atm.ino</span>
                <p className="text-slate-400 text-xs mt-0.5">Ready to flash with Arduino IDE 2.x</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <pre className="text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed max-h-[500px]">
              {firmwareCode}
            </pre>
          </div>
        )}

        {/* TAB 4: API DOCS */}
        {activeTab === 'api-docs' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 text-xs">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              ESP32 Device Endpoints Specification
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded">POST</span>
                  <span className="font-mono font-bold text-slate-900">/api/devices/:deviceId/dispensing/claim</span>
                </div>
                <p className="text-slate-600">Header: <code className="font-mono">X-Device-Token: &lt;secret&gt;</code>. Returns oldest pending authorized job.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded">POST</span>
                  <span className="font-mono font-bold text-slate-900">/api/devices/:deviceId/dispensing/telemetry</span>
                </div>
                <p className="text-slate-600">Streams live pulse count and ml dispensed every 1000ms while pump is active.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold rounded">POST</span>
                  <span className="font-mono font-bold text-slate-900">/api/devices/:deviceId/dispensing/complete</span>
                </div>
                <p className="text-slate-600">Confirms pump stopped and target milliliters dispensed. Deducts inventory stock.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-mono font-bold rounded">POST</span>
                  <span className="font-mono font-bold text-slate-900">/api/devices/:deviceId/heartbeat</span>
                </div>
                <p className="text-slate-600">Reports ESP32 online presence, temperature, and IP every 10s.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
