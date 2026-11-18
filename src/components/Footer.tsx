import React from 'react';
import { useApp, PageName } from '../context/AppContext';
import {
  Droplets,
  Leaf,
  ShieldCheck,
  Recycle,
  Heart,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo } = useApp();

  const handleNav = (page: PageName) => {
    navigateTo(page);
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Environmental Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/30 p-8 mb-14 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
                <Recycle className="w-8 h-8 animate-spin-slow" />
              </div>
              <div>
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">
                  🌱 Sustainable Dairy Initiative
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  Say No to Plastic Milk Pouches — Bring Your Own Container.
                </h3>
                <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
                  Traditional milk distribution produces thousands of tons of non-biodegradable multilayer plastic pouch waste every single day.
                  <span className="text-emerald-300 font-semibold"> Smart Milk ATM</span> provides fresh, hygienic farm-direct milk dispensed directly into your sanitized reusable containers.
                </p>
                <p className="text-slate-400 text-xs mt-1.5 italic">
                  * Note: True environmental benefits depend on customers actively reusing clean, food-safe containers.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleNav('buy-milk')}
              className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition active:scale-95 text-sm flex items-center gap-2 cursor-pointer"
            >
              <Droplets className="w-4 h-4 fill-current" />
              Get Fresh Milk Now
            </button>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-800 text-sm">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                <Droplets className="w-5 h-5 fill-current" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                SMART MILK <span className="text-emerald-400">ATM</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Smart Milk ATM — Fresh Milk, Smart Payment, Zero Plastic Pouches. An automated, IoT-enabled dispensing solution designed for engineering excellence and green community nutrition.
            </p>
            <div className="space-y-2 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kiosk #01: 80 Feet Road, 4th Block, Koramangala, Bengaluru, KA 560034</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kiosk Support Helpline: +91 80 4967 8820 (8 AM – 8 PM)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>support@smartmilkatm.in</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Vending & System</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => handleNav('buy-milk')} className="hover:text-emerald-400 transition">
                  Buy Fresh Milk
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('milk-pricing')} className="hover:text-emerald-400 transition">
                  Milk Pricing & Tiers
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('order-history')} className="hover:text-emerald-400 transition">
                  Track Past Dispenses
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('hardware-hub')} className="hover:text-emerald-400 transition flex items-center gap-1">
                  ESP32 Circuit & Firmware
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('faq')} className="hover:text-emerald-400 transition">
                  Frequently Asked Questions
                </button>
              </li>
            </ul>
          </div>

          {/* Razorpay Merchant Compliance Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Policies & Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => handleNav('terms')} className="hover:text-emerald-400 transition">
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('privacy-policy')} className="hover:text-emerald-400 transition">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('refund-policy')} className="hover:text-emerald-400 transition text-amber-300 hover:text-amber-200">
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('shipping-policy')} className="hover:text-emerald-400 transition">
                  Shipping & Delivery Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('contact-us')} className="hover:text-emerald-400 transition">
                  Contact Merchant / Operator
                </button>
              </li>
            </ul>
          </div>

          {/* Project & Hygiene Standards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Food Safety & Quality</h4>
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Chilled at 2°C – 4°C</span>
              </div>
              <p className="text-slate-400 leading-snug">
                Insulated, food-grade SS304 stainless steel milk vessel with automated clean-in-place (CIP) sanitation.
              </p>
              <div className="pt-1 text-[10px] text-slate-500 border-t border-slate-700">
                Self-Service Kiosk Pickup Only. Please bring cleaned, sanitized food-grade vessels.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Smart Milk ATM Project. All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Engineered with <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> for Sustainable Dairy
            </span>
            <span className="text-slate-700">•</span>
            <span>Razorpay Payment Gateway Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
