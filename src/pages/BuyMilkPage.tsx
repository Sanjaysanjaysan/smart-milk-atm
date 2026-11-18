import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Droplets,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  FlaskConical,
} from 'lucide-react';

export const BuyMilkPage: React.FC = () => {
  const { priceTiers, machine, createOrder, navigateTo, pageParams, addToast } = useApp();
  const { user } = useAuth();

  const [selectedQuantity, setSelectedQuantity] = useState<number>(() => {
    return pageParams?.preselectTier || 500;
  });
  const [containerConfirmed, setContainerConfirmed] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (pageParams?.preselectTier) {
      setSelectedQuantity(Number(pageParams.preselectTier));
    }
  }, [pageParams]);

  const activeTier = priceTiers.find((t) => t.quantityMl === selectedQuantity) || priceTiers[1] || {
    id: 'custom',
    quantityMl: selectedQuantity,
    label: `${selectedQuantity} ml`,
    priceInr: Math.round((selectedQuantity * 60) / 1000),
    pricePaise: Math.round((selectedQuantity * 60) / 1000) * 100,
    defaultRunTimeMs: 10000,
    estimatedPulses: 2250,
  };

  const handleProceedToPayment = async () => {
    if (!containerConfirmed) {
      addToast('warning', 'Container Required', 'Please confirm that you have placed a clean container under the nozzle.');
      return;
    }

    if (machine?.status === 'EMERGENCY_STOP') {
      addToast('error', 'Kiosk Safety Halt', 'The dispensing kiosk is currently in emergency stop mode. Please contact support.');
      return;
    }

    if (machine && machine.currentStockLiters < selectedQuantity / 1000) {
      addToast('error', 'Insufficient Milk Stock', 'The kiosk milk tank currently has insufficient milk for this quantity. Please choose a smaller quantity or notify the operator.');
      return;
    }

    setIsSubmitting(true);
    const order = await createOrder(selectedQuantity);
    setIsSubmitting(false);

    if (order) {
      navigateTo('payment', { orderId: order.orderId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header Banner */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Droplets className="w-3.5 h-3.5 fill-current" />
            Step 1 of 3: Quantity Selection
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Select Your Milk Quantity
          </h1>
          <p className="text-slate-600 text-sm mt-1.5">
            Server-verified pricing calculated at demonstration rates. Freshly chilled pure dairy dispensed straight into your reusable vessel.
          </p>
        </div>

        {/* Machine Readiness Check */}
        {machine && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
            machine.status === 'READY'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : machine.status === 'EMERGENCY_STOP'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${
                machine.status === 'READY' ? 'bg-emerald-500 animate-pulse' :
                machine.status === 'EMERGENCY_STOP' ? 'bg-red-600' : 'bg-amber-500'
              }`} />
              <div>
                <span className="font-bold">Kiosk #{machine.machineId}: </span>
                <span>{machine.name}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/70 font-semibold uppercase">
                  {machine.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600">
              <span>Tank Stock: <strong className="text-slate-900">{machine.currentStockLiters} L</strong></span>
              <span>Chiller: <strong className="text-slate-900">{machine.temperatureCelsius}°C</strong></span>
            </div>
          </div>
        )}

        {/* 4 Cards Grid for Quantities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {priceTiers.map((tier) => {
            const isSelected = selectedQuantity === tier.quantityMl;

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedQuantity(tier.quantityMl)}
                className={`relative rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between border-2 ${
                  isSelected
                    ? 'bg-white border-emerald-600 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-100 scale-[1.02]'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Active Pill */}
                {isSelected && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selected
                  </div>
                )}

                <div>
                  {/* Top Tier Badge & Price */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {tier.label.split('(')[1]?.replace(')', '') || 'Regular'}
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      ₹{tier.priceInr}
                    </span>
                  </div>

                  {/* Bottle Graphic */}
                  <div className="my-5 flex flex-col items-center">
                    <div className="relative w-20 h-32 rounded-3xl border-3 border-slate-300 bg-slate-100/60 overflow-hidden flex flex-col justify-end p-1 shadow-inner">
                      {/* Bottle Cap */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded-t-sm bg-emerald-600" />
                      
                      {/* Fill volume */}
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 rounded-2xl transition-all duration-500 shadow-md relative"
                        style={{ height: `${(tier.quantityMl / 1000) * 100}%` }}
                      >
                        <div className="absolute top-1 left-2 right-2 h-1 bg-white/40 rounded-full" />
                      </div>
                    </div>

                    <div className="text-xl font-black text-slate-900 mt-3">
                      {tier.quantityMl === 1000 ? '1 Litre (1000 ml)' : `${tier.quantityMl} ml`}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Est. {(tier.defaultRunTimeMs / 1000).toFixed(0)} seconds dispense
                    </div>
                  </div>
                </div>

                {/* Selection Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedQuantity(tier.quantityMl);
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Chosen Quantity
                    </>
                  ) : (
                    <>
                      <Droplets className="w-3.5 h-3.5" />
                      Select {tier.quantityMl} ml
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Summary Card & Action Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Order Configuration Summary
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <h3 className="text-2xl font-black text-slate-900">
                  Selected Quantity: <span className="text-emerald-700">{selectedQuantity} ml</span>
                </h3>
                <span className="text-slate-300 text-xl font-bold">•</span>
                <span className="text-2xl font-black text-slate-900">
                  Amount Payable: <span className="text-emerald-700">₹{activeTier.priceInr}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Price verified server-side. No hidden charges or packaging fees.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setSelectedQuantity(selectedQuantity === 250 ? 500 : 250)}
                className="flex-1 md:flex-none px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Change Quantity
              </button>

              <button
                onClick={handleProceedToPayment}
                disabled={isSubmitting}
                className="flex-1 md:flex-none px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>Initializing Order...</>
                ) : (
                  <>
                    Proceed to Payment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Container & Safety Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Container Safety Checklist
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={containerConfirmed}
                  onChange={(e) => setContainerConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700">
                  <strong>Food-grade container placed under nozzle:</strong> My container is clean, sanitized, and capable of holding at least {selectedQuantity} ml.
                </span>
              </label>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Plastic Waste:</strong> By bringing your own vessel, you are preventing 1 single-use plastic pouch from entering the landfill.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
