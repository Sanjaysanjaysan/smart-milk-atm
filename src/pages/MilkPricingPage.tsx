import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Droplets,
  CheckCircle2,
  ShieldCheck,
  Thermometer,
  Award,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react';

export const MilkPricingPage: React.FC = () => {
  const { priceTiers, navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Fair & Transparent Dairy Economics
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Milk Pricing & Quality Standards
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            100% farm-sourced pasteurized cow milk. Demonstrative rate calculated at ₹60 per liter without packaging or plastic surcharges.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {priceTiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                  {tier.quantityMl} ml
                </span>

                <div className="mt-4 mb-2">
                  <span className="text-3xl font-black text-slate-900">₹{tier.priceInr}</span>
                  <span className="text-xs text-slate-400 font-normal"> / dispense</span>
                </div>

                <p className="text-slate-600 font-bold text-xs">{tier.label}</p>
                <p className="text-slate-400 text-[11px] mt-1">
                  Single-use plastic surcharge: <strong className="text-emerald-700">₹0 (BYOC)</strong>
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>~{(tier.defaultRunTimeMs / 1000).toFixed(0)} sec pulse dispense</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Instant UPI confirmation</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigateTo('buy-milk', { preselectTier: tier.quantityMl })}
                className="w-full mt-6 bg-slate-900 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Droplets className="w-3.5 h-3.5" />
                Select {tier.quantityMl} ml
              </button>
            </div>
          ))}
        </div>

        {/* Nutritional & Chemical Composition */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            Dairy Quality & Nutritional Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Milk Fat Content</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">4.5% Min</div>
              <p className="text-slate-500 text-[11px] mt-1">Naturally rich cream consistency</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Solid-Not-Fat (SNF)</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">8.5% Min</div>
              <p className="text-slate-500 text-[11px] mt-1">High protein & calcium density</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Storage Temperature</span>
              <div className="text-2xl font-black text-blue-600 mt-0.5">2°C – 4°C</div>
              <p className="text-slate-500 text-[11px] mt-1">Continuous cold chain preservation</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Processing Type</span>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">HTST Pasteur</div>
              <p className="text-slate-500 text-[11px] mt-1">High-temperature short-time sanitized</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Demonstration Price Disclaimer:</strong> The prices shown (₹15 for 250ml, ₹30 for 500ml, ₹45 for 750ml, ₹60 for 1000ml) are demonstration reference values configured for engineering evaluation and test mode. Actual live commercial vending rates are subject to local dairy cooperative market conditions and can be modified via the administrative console.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
