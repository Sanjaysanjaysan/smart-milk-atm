import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Droplets,
  Leaf,
  Recycle,
  Award,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const AboutUsPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            Engineering Capstone & Clean Tech Innovation
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            About the Smart Milk ATM Initiative
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Bridging Internet-of-Things (IoT) automation, digital UPI payments, and environmental sustainability to eradicate single-use plastic milk pouches across urban communities.
          </p>
        </div>

        {/* Environmental Mission Statement */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-emerald-500/30 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-emerald-400 font-bold uppercase tracking-wider text-xs">
            <Leaf className="w-4 h-4 fill-current" />
            <span>The Plastic Crisis in Milk Distribution</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug">
            Say No to Plastic Milk Pouches — Bring Your Own Container.
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            In India alone, over 50 million multilayer plastic milk pouches are discarded every day. Due to fat contamination and multi-polymer construction, these pouches cannot be easily recycled and clog municipal drainage channels or release toxins in waste dumps.
          </p>

          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            The <strong className="text-emerald-400">Smart Milk ATM</strong> reimagines the traditional milk booth as an intelligent, automated, 24/7 cold-chain kiosk. Customers bring their own food-grade containers, select exact milliliters, complete real-time UPI payment via Razorpay, and receive pure, chilled, unadulterated milk.
          </p>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 italic">
            * Note: Environmental benefits depend on customers actively bringing and reusing clean personal containers instead of requesting single-use plastics.
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Recycle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Zero Plastic Waste</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Every liter collected via reusable stainless steel cans saves 2 pouches from municipal landfills, fostering circular community habits.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cold Chain Hygiene</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Maintained at a chilled 2°C – 4°C with food-grade SS304 storage and periodic automated Clean-In-Place (CIP) sanitization cycles.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Digital Automation</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Razorpay dynamic UPI payments integrated with ESP32 microcontroller edge actuation and pulse-calibrated dispensing precision.
            </p>
          </div>
        </div>

        {/* Academic Project & Commercial Road Map */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xl font-black text-slate-900">Engineering Project Team & Vision</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            Developed as a comprehensive final-year engineering capstone project designed for scalable real-world deployment across residential societies, dairy farmer cooperatives, and university campuses.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <button
              onClick={() => navigateTo('buy-milk')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Droplets className="w-4 h-4 fill-current" />
              Try Dispensing Milk Now
            </button>
            <button
              onClick={() => navigateTo('hardware-hub')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-6 py-3 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer"
            >
              Inspect IoT Architecture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
