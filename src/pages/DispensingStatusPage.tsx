import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { upsertOrderInFirestore } from '../services/firestoreService';
import {
  Droplets,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  Cpu,
  Clock,
  Sparkles,
  ArrowRight,
  Receipt,
  Download,
  Printer,
  Zap,
} from 'lucide-react';
import { downloadReceiptPdf, printReceiptPdf } from '../utils/receiptGenerator';

export const DispensingStatusPage: React.FC = () => {
  const { currentOrder, setCurrentOrder, navigateTo, pageParams, machine, emergencyStop, addToast } = useApp();
  const orderId = pageParams?.orderId || currentOrder?.orderId;

  const [order, setOrder] = useState<any>(currentOrder);
  const [job, setJob] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [isEmergencyStopped, setIsEmergencyStopped] = useState<boolean>(false);

  // Poll order & dispensing status every 1.5 seconds
  useEffect(() => {
    if (!orderId) {
      navigateTo('home');
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          setJob(data.job);
          setCurrentOrder(data.order);
          if (data.machineStatus === 'EMERGENCY_STOP') {
            setIsEmergencyStopped(true);
          }
        }
      } catch {
        // network fallback
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => clearInterval(interval);
  }, [orderId]);

  // Automated or interactive simulation helper to advance the dispensing cycle for demonstration
  const handleSimulateHardwareDispense = async () => {
    if (!orderId) return;
    try {
      setSimulating(true);
      const res = await fetch('/api/simulator/simulate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setJob(data.job);
        if (data.order?.dispensingStatus === 'COMPLETED') {
          void upsertOrderInFirestore(data.order);
        }
      }
    } catch (e: any) {
      addToast('error', 'Simulation error', e.message);
    } finally {
      setSimulating(false);
    }
  };

  const targetMl = order?.quantityMl || 500;
  const dispensedMl = job?.dispensedMl ?? (order?.dispensingStatus === 'COMPLETED' ? targetMl : (order?.dispensedMl ?? 0));
  const remainingMl = Math.max(0, targetMl - dispensedMl);
  const progressPercent = Math.min(100, Math.round((dispensedMl / targetMl) * 100));

  const isCompleted = order?.dispensingStatus === 'COMPLETED' || progressPercent >= 100;
  const isDispensing = order?.dispensingStatus === 'DISPENSING';
  const isWaiting = order?.dispensingStatus === 'PENDING_DISPENSE';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Step Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Droplets className="w-3.5 h-3.5 fill-current" />
            Step 3 of 3: Automated Milk Dispense
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isCompleted ? 'YOUR MILK IS READY!' : isDispensing ? 'DISPENSING STARTED' : 'WAITING FOR DISPENSER'}
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            Order Reference: <span className="font-mono font-bold text-slate-800">{orderId}</span>
          </p>
        </div>

        {/* Emergency Stop Banner if active */}
        {isEmergencyStopped && (
          <div className="p-4 rounded-2xl bg-red-600 text-white flex items-center justify-between text-xs font-bold shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-300" />
              <span>EMERGENCY STOP ENGAGED: Pump halted immediately by safety interlock.</span>
            </div>
          </div>
        )}

        {/* Main Dispensing Visualization Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Animated Bottle / Container Filling SVG */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-48 h-72 rounded-3xl border-4 border-slate-700 bg-slate-900/90 overflow-hidden shadow-2xl flex flex-col justify-end p-2">
                {/* Nozzle dripping simulation if dispensing */}
                {isDispensing && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-full bg-white/60 animate-pulse pointer-events-none z-20" />
                )}

                {/* Container Level Markings */}
                <div className="absolute top-4 left-3 text-[10px] font-mono text-slate-400 space-y-9 pointer-events-none z-20">
                  <div>— {targetMl}ml</div>
                  <div>— {Math.round(targetMl * 0.75)}ml</div>
                  <div>— {Math.round(targetMl * 0.5)}ml</div>
                  <div>— {Math.round(targetMl * 0.25)}ml</div>
                </div>

                {/* Milk Liquid Fill */}
                <div
                  className="w-full bg-gradient-to-t from-slate-100 via-amber-50 to-white rounded-2xl transition-all duration-700 shadow-xl relative overflow-hidden"
                  style={{ height: `${progressPercent}%` }}
                >
                  {/* Liquid Wave Effect */}
                  {isDispensing && (
                    <div className="absolute top-0 left-0 right-0 h-2 bg-white/90 rounded-full animate-bounce" />
                  )}
                  <div className="absolute inset-0 bg-blue-500/5" />
                </div>

                {/* Center Stats Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                  <span className="text-3xl font-black text-slate-900 bg-white/90 px-3 py-1 rounded-xl shadow-md">
                    {progressPercent}%
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 mt-1 bg-white/80 px-2 py-0.5 rounded">
                    {dispensedMl} / {targetMl} ml
                  </span>
                </div>
              </div>

              <div className="text-center mt-3 text-xs text-slate-500 font-medium">
                {isCompleted ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-4 h-4" /> Container Full
                  </span>
                ) : (
                  <span>Do not move container during dispensing</span>
                )}
              </div>
            </div>

            {/* Right: Live Telemetry & Real-Time Machine Status */}
            <div className="md:col-span-7 space-y-6">
              {/* Telemetry Dashboard Data */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3.5 text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-200">
                  Dispenser Telemetry & Control
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500">Milk Quantity:</span>
                    <p className="text-base font-bold text-slate-900">{targetMl} ml</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Payment Status:</span>
                    <p className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified (₹{order?.amountInr})
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Device Status:</span>
                    <p className="text-slate-900 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {machine?.status || 'CONNECTED'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Pump Status:</span>
                    <p className={`font-bold ${isDispensing ? 'text-blue-600 animate-pulse' : 'text-slate-700'}`}>
                      {isDispensing ? '⚡ Running (12V DC)' : isCompleted ? 'Stopped (Complete)' : 'Standby / Ready'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Volume Dispensed:</span>
                    <p className="text-lg font-black text-emerald-700">{dispensedMl} ml</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Remaining Volume:</span>
                    <p className="text-lg font-black text-slate-800">{remainingMl} ml</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Dispensing Progress:</span>
                    <span className="font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 italic">
                  * Volume measured via YF-S201 Hall-Effect flow sensor pulses on GPIO 27 (calibrated: {machine?.pulsesPerMl || 4.5} pulses/ml).
                </div>
              </div>

              {/* Hardware Simulator Trigger (For Lab Testing & Demonstrations) */}
              {!isCompleted && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      ESP32 IoT Simulation Control
                    </span>
                    <span className="text-[10px] font-mono bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold">
                      DEMO CONTROLLER
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 leading-snug">
                    Click to simulate the ESP32 claiming this authorized job and pumping milk. (Physical ESP32 microcontrollers also poll this endpoint automatically!)
                  </p>
                  <button
                    onClick={handleSimulateHardwareDispense}
                    disabled={simulating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {simulating ? 'Pumping Milk...' : `Simulate Pump Pulse (+${Math.round(targetMl * 0.35)} ml)`}
                  </button>
                </div>
              )}

              {/* Emergency Stop Button */}
              {!isCompleted && (
                <button
                  onClick={async () => {
                    await emergencyStop();
                    setIsEmergencyStopped(true);
                  }}
                  className="w-full py-2.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Customer Emergency Stop (Cut Pump Power)
                </button>
              )}
            </div>
          </div>

          {/* Completion Banner */}
          {isCompleted && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-emerald-950">
                  Milk Dispensing Completed. Thank you for using Smart Milk ATM!
                </h3>
                <p className="text-sm font-semibold text-emerald-800 mt-1">
                  {targetMl} ml chilled farm-fresh milk safely dispensed into your container.
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Please securely cap your reusable container. Dispensing cycle recorded in database audit log.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {order && (
                  <>
                    <button
                      onClick={() => {
                        try {
                          downloadReceiptPdf(order);
                          addToast('success', 'PDF Downloaded', `Receipt for ${order.orderId} saved.`);
                        } catch (err: any) {
                          addToast('error', 'Download Failed', err.message);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Receipt (PDF)
                    </button>

                    <button
                      onClick={() => {
                        try {
                          printReceiptPdf(order);
                        } catch (err: any) {
                          addToast('error', 'Print Failed', err.message);
                        }
                      }}
                      className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      Print Receipt
                    </button>
                  </>
                )}

                <button
                  onClick={() => navigateTo('order-history')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  View All Orders
                </button>

                <button
                  onClick={() => navigateTo('buy-milk')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Make Another Purchase
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
