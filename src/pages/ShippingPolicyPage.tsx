import React from 'react';
import { MapPin, AlertCircle, ShieldCheck } from 'lucide-react';

export const ShippingPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-8 text-xs text-slate-600 leading-relaxed">
        <div className="border-b border-slate-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Fulfillment & Delivery Model
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Shipping and Delivery Policy
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Self-Service Physical Kiosk Collection Policy • Explicit No Home-Delivery Disclosure
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Physical Kiosk Collection Model</h2>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-blue-950 font-medium">
            <strong>Important Consumer Notice:</strong> Smart Milk ATM does <strong>NOT</strong> provide door-to-door courier or home delivery services. All dairy products purchased through this platform must be collected physically in person at our designated automated milk vending kiosks.
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Immediate On-Site Fulfillment Timeline</h2>
          <p>
            Because fulfillment takes place at the physical vending machine:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Delivery Time:</strong> Immediate upon successful payment verification (dispensing commences within 3 to 5 seconds of backend confirmation).</li>
            <li><strong>Dispensing Duration:</strong> Approximately 5 to 20 seconds depending on the selected volume (250ml = ~5s, 500ml = ~10s, 750ml = ~15s, 1000ml = ~20s).</li>
            <li><strong>Shipping / Handling Fees:</strong> ₹0.00. There are no shipping, courier, logistics, or delivery charges.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Operational Kiosk Locations</h2>
          <p>Customers can collect fresh milk at our registered demonstration kiosk:</p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 space-y-1">
            <p className="font-bold">Kiosk Terminal #01 (Bengaluru Demonstration Unit)</p>
            <p className="text-slate-500">80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034</p>
            <p className="text-[11px] text-emerald-700 font-semibold">Active Hours: 24 Hours Automated Service</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Food Safety & Temperature Preservation During Transit</h2>
          <p>
            Milk is dispensed chilled at 2°C to 4°C. Once dispensed into your reusable container, you are advised to transport the milk directly to your home refrigerator or consume it promptly to preserve cold-chain freshness. The Operator is not liable for spoilage arising from prolonged transit under ambient summer temperatures.
          </p>
        </section>
      </div>
    </div>
  );
};
