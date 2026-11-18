import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { config, machine, navigateTo } = useApp();

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-blue-900 text-white text-xs px-4 py-2 border-b border-emerald-500/20 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {config.demoMode ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              DEMO MODE {config.razorpayMode === 'LIVE' ? '(LIVE SAFETY LOCK ACTIVE)' : 'SIMULATION'}
            </span>
          ) : config.razorpayMode === 'LIVE' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              RAZORPAY LIVE MODE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              RAZORPAY TEST GATEWAY
            </span>
          )}
          <span className="text-slate-300 hidden sm:inline">
            {config.demoMode
              ? 'Demo Safety Lock Active: Real banking charges and physical dispensing remain disabled until DEMO_MODE=false.'
              : config.razorpayMode === 'LIVE'
              ? 'Live Mode: Connected to Razorpay Live payment gateway and authenticated physical ESP32 dispensing kiosk.'
              : 'Test Gateway Mode: Connected to Razorpay Test checkout and backend HMAC-SHA256 verification.'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {config.firebaseMode === 'STARTER_TIER_CLIENT_SDK' && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-400/25 text-[10px] font-semibold">
              Firebase Free-Tier Auth/DB
            </span>
          )}
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              machine?.status === 'READY' ? 'bg-emerald-400' :
              machine?.status === 'DISPENSING' ? 'bg-blue-400' :
              machine?.status === 'EMERGENCY_STOP' ? 'bg-red-500' : 'bg-amber-400'
            }`} />
            <span>Kiosk #{machine?.machineId || config.defaultMachineId}: {machine?.status || 'ONLINE'}</span>
          </div>

          <button
            onClick={() => navigateTo('hardware-hub')}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md transition text-[11px] font-medium border border-white/15"
          >
            <Cpu className="w-3 h-3 text-cyan-300" />
            ESP32 Lab & Firmware
          </button>
        </div>
      </div>
    </div>
  );
};
