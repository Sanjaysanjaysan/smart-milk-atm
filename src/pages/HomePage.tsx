import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Droplets,
  Leaf,
  ShieldCheck,
  QrCode,
  Recycle,
  Sparkles,
  ArrowRight,
  Thermometer,
  CheckCircle2,
  Clock,
  Award,
  Zap,
  Cpu,
  ChevronRight,
  HeartHandshake,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigateTo, machine, priceTiers } = useApp();
  const [calculatorDays, setCalculatorDays] = useState<number>(30);
  const [dailyQuantity, setDailyQuantity] = useState<number>(1000); // ml

  // Plastic pouch waste calculation:
  // 1 pouch per 500ml or 1000ml -> approx (dailyQuantity / 500) * days pouches
  const pouchesPrevented = Math.round((dailyQuantity / 500) * calculatorDays);
  const plasticGramsPrevented = Math.round(pouchesPrevented * 4.2); // ~4.2g multilayer plastic per 500ml pouch

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white pt-12 pb-24 sm:pt-20 sm:pb-32">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
                <Leaf className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Zero Single-Use Plastic Pouches • IoT Enabled Vending</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
                Fresh Milk.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
                  Smart Payments.
                </span>{' '}
                Sustainable Future.
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Experience convenient milk dispensing with secure digital payments. Choose your quantity, complete your payment and collect milk in your reusable container.
              </p>

              {/* Environmental Notice */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-3 backdrop-blur-sm">
                <Recycle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Say No to Plastic Milk Pouches — Bring Your Own Container.</span>
                  <p className="text-slate-400 mt-0.5">
                    * Environmental benefits depend on customers bringing and reusing clean, food-safe containers.
                  </p>
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => navigateTo('buy-milk')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-7 py-4 rounded-2xl shadow-xl shadow-emerald-500/25 transition active:scale-95 flex items-center gap-2.5 text-base cursor-pointer"
                >
                  <Droplets className="w-5 h-5 fill-current" />
                  Buy Milk
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white/10 hover:bg-white/15 text-white font-bold px-6 py-4 rounded-2xl border border-white/20 transition backdrop-blur-sm text-sm"
                >
                  How It Works
                </button>

                <button
                  onClick={() => navigateTo('about-us')}
                  className="text-slate-300 hover:text-white font-semibold px-4 py-4 rounded-2xl hover:bg-white/5 transition text-sm flex items-center gap-1.5"
                >
                  About Our Project
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800 text-xs">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-white">4.5% / 8.5%</div>
                  <div className="text-slate-400">Fat & SNF Standard</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">3.8°C</div>
                  <div className="text-slate-400">Chilled Continuous</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-blue-400">&lt; 30 sec</div>
                  <div className="text-slate-400">Instant UPI Dispense</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Kiosk Card & Milk Visualization */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                {/* Live Machine Status Tag */}
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                      Live Kiosk Status: {machine?.status || 'READY'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {machine?.machineId || 'ATM-KA-001'}
                  </span>
                </div>

                {/* Milk Vessel Visual Representation */}
                <div className="relative my-4 flex flex-col items-center">
                  <div className="relative w-44 h-60 rounded-3xl border-4 border-slate-600 bg-slate-950/60 overflow-hidden shadow-inner flex flex-col justify-end">
                    {/* Measurement graduation markings */}
                    <div className="absolute top-4 right-2 text-[10px] font-mono text-slate-500 space-y-7 pointer-events-none">
                      <div>1000ml —</div>
                      <div>750ml —</div>
                      <div>500ml —</div>
                      <div>250ml —</div>
                    </div>

                    {/* Liquid Milk Level with animated top wave */}
                    <div
                      className="w-full bg-gradient-to-t from-slate-100 via-amber-50 to-white relative transition-all duration-1000 shadow-lg"
                      style={{ height: `${Math.min(100, Math.max(20, ((machine?.currentStockLiters || 84.5) / (machine?.tankCapacityLiters || 100)) * 100))}%` }}
                    >
                      <div className="absolute -top-2 left-0 right-0 h-3 bg-white/80 rounded-full blur-[1px] opacity-80 animate-pulse" />
                      <div className="absolute inset-0 bg-blue-500/5" />
                    </div>

                    {/* Center Overlay info */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                      <Droplets className="w-8 h-8 text-emerald-600/70 mb-1" />
                      <span className="text-xs font-bold text-slate-900 bg-white/80 px-2 py-0.5 rounded-md shadow-xs">
                        {machine?.currentStockLiters || 84.5} Liters In Tank
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-3 text-center">
                    Insulated SS304 Dairy Storage • Clean-in-Place (CIP) Certified
                  </p>
                </div>

                {/* Telemetry Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
                      <Thermometer className="w-3.5 h-3.5" />
                      Temperature
                    </div>
                    <div className="text-lg font-black text-white">
                      {machine?.temperatureCelsius || 3.8}°C
                    </div>
                    <div className="text-[10px] text-slate-400">Micro-Chiller Active</div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                      <Cpu className="w-3.5 h-3.5" />
                      ESP32 Controller
                    </div>
                    <div className="text-lg font-black text-white">
                      GPIO 26 / 27
                    </div>
                    <div className="text-[10px] text-slate-400">Flow Pulse Interrupt</div>
                  </div>
                </div>

                {/* Direct Order Quick Button */}
                <button
                  onClick={() => navigateTo('buy-milk')}
                  className="w-full mt-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  Select Quantity & Dispense
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS 4-STEP SECTION */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-emerald-700 font-bold uppercase tracking-wider text-xs">
              Seamless 4-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              How the Smart Milk ATM Works
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
              Designed for effortless daily dairy purchases with complete food safety, instant UPI payment, and zero single-use plastic waste.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 relative group hover:shadow-lg transition duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-lg mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Bring Container</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Bring your own clean, food-safe reusable bottle or stainless steel milk can. Place it securely under the dispensing nozzle.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> No plastic pouches needed
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 relative group hover:shadow-lg transition duration-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 font-black flex items-center justify-center text-lg mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Select Quantity</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Choose 250ml, 500ml, 750ml, or 1000ml on the touch screen or mobile web application. Server confirms pricing in real time.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fair server-verified rate
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 relative group hover:shadow-lg transition duration-200">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black flex items-center justify-center text-lg mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Pay via UPI</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Scan the dynamic Razorpay UPI QR code with GPay, PhonePe, Paytm, or any UPI app. Backend securely captures & verifies the payment.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Razorpay webhook verified
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 relative group hover:shadow-lg transition duration-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-lg mb-4">
                04
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Automatic Dispense</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                ESP32 verifies authorization token, starts the 12V food-grade pump, counts flow pulses, and auto-stops at the exact volume.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Calibrated pulse flow
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUANTITY & PRICING PREVIEW */}
      <section className="py-20 bg-slate-100/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-emerald-700 font-bold uppercase tracking-wider text-xs">
                Transparent Dairy Pricing
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">
                Available Quantities & Demonstration Rates
              </h2>
            </div>
            <button
              onClick={() => navigateTo('milk-pricing')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View Full Nutrition & Fat Standards
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {priceTiers.map((tier) => (
              <div
                key={tier.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                      {tier.quantityMl} ml
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      ₹{tier.priceInr}
                    </span>
                  </div>

                  <div className="w-20 h-28 mx-auto my-3 relative flex items-center justify-center">
                    <div className="w-14 h-24 rounded-2xl border-2 border-slate-300 bg-emerald-50/50 flex flex-col justify-end overflow-hidden p-1">
                      <div
                        className="w-full bg-emerald-600 rounded-lg transition-all duration-300 opacity-80"
                        style={{ height: `${(tier.quantityMl / 1000) * 100}%` }}
                      />
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 text-center mb-1">
                    {tier.label}
                  </h4>
                  <p className="text-slate-500 text-xs text-center mb-4">
                    Est. Pump Time: ~{(tier.defaultRunTimeMs / 1000).toFixed(0)} sec
                  </p>
                </div>

                <button
                  onClick={() => navigateTo('buy-milk', { preselectTier: tier.quantityMl })}
                  className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  Select {tier.quantityMl} ml
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ENVIRONMENTAL IMPACT CALCULATOR */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-emerald-500/30 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">
                  Interactive Impact Calculator
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Calculate Your Plastic Pouch Reduction
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Every household consumes 1 to 2 single-use multilayer LDPE plastic pouches daily for milk. Because multilayer pouches are contaminated with dairy fat and hard to recycle, most end up in landfills or storm drains.
                </p>

                {/* Sliders */}
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-300">Daily Milk Consumption:</span>
                      <span className="text-emerald-400 font-mono font-bold">{dailyQuantity} ml</span>
                    </div>
                    <input
                      type="range"
                      min="250"
                      max="3000"
                      step="250"
                      value={dailyQuantity}
                      onChange={(e) => setDailyQuantity(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-300">Timeframe:</span>
                      <span className="text-emerald-400 font-mono font-bold">{calculatorDays} Days ({Math.round(calculatorDays / 30)} months)</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="365"
                      step="30"
                      value={calculatorDays}
                      onChange={(e) => setCalculatorDays(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Calculator Output KPI Card */}
              <div className="lg:col-span-5">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Recycle className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-4xl sm:text-5xl font-black text-emerald-300">
                      {pouchesPrevented}
                    </div>
                    <div className="text-xs uppercase tracking-wider font-bold text-slate-300 mt-1">
                      Plastic Pouches Prevented
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                    Saves approximately <span className="text-white font-bold">{plasticGramsPrevented} grams</span> of non-biodegradable multilayer polyethylene from local landfills.
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    * Assumes customer persistently reuses clean personal stainless steel or food-grade containers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ENGINEERING & HARDWARE HIGHLIGHTS */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-blue-700 font-bold uppercase tracking-wider text-xs">
              Hardware Architecture & Reliability
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-1">
              Built for Engineering Excellence
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              Dual protection mechanisms combine cryptographic backend payment verification with edge ESP32 safety interlocks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cryptographic Auth</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Pump activation requires a signed backend authorization token generated only after captured Razorpay payments. The pump never fires from a raw client button click.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">ESP32 Edge Microcontroller</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Controls the 1-channel relay on GPIO 26 with configurable Active-LOW polarity. Initialized in OFF state during boot to prevent accidental dispensing.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Dual-Cutoff Safety</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Hall-effect flow sensor counts calibrated volume pulses. A hardware watchdog trips a 25-second maximum runtime limit if the flow meter ever stalls.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => navigateTo('hardware-hub')}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-2xl transition text-xs shadow-md cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              Open ESP32 Pinout & Circuit Schematic
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
