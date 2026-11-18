import React from 'react';
import { RotateCcw, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-8 text-xs text-slate-600 leading-relaxed">
        <div className="border-b border-slate-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Consumer Protection & Fair Settlement
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Refund and Cancellation Policy
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compliant with Razorpay Merchant Guidelines & RBI Digital Payment Settlement Rules
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Nature of the Product & Cancellation Window</h2>
          <p>
            Due to the fresh, perishable, and immediate dispensing nature of dairy products, once a customer selects a quantity and confirms payment at the physical kiosk, <strong>cancellations cannot be entertained after the milk pump has initiated dispensing</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Eligibility for Refund: Payment Captured But Milk Not Dispensed</h2>
          <p>
            A customer is fully entitled to an automatic or operator-assisted refund under the following verified technical failure conditions:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Verified Payment with Zero Dispense:</strong> The customer's UPI account was debited, Razorpay confirmed capture, but the ESP32 flow meter registered 0 ml due to mechanical stall, power outage, or sudden milk tank depletion.</li>
            <li><strong>Partial Dispense:</strong> The pump stopped prematurely due to an automated safety interlock (e.g. no-flow cutoff or emergency stop), resulting in less than 50% of the purchased volume being delivered.</li>
            <li><strong>Duplicate Billing:</strong> Multiple debits incurred for a single dispensing session due to network latency.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Non-Instant Refund Processing Timeline</h2>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Standard Banking Settlement: 5 to 7 Business Days</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              In compliance with standard banking clearance and NPCI UPI settlement protocols, <strong>refunds are NOT instantaneous</strong>. Once our backend verifies that the dispensing job failed, a reversal instruction is issued to the Razorpay payment gateway. Funds are credited back to the customer's original UPI handle or bank account within <strong>5 to 7 working days</strong>.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Non-Refundable Scenarios</h2>
          <p>Refunds will not be approved under the following customer-side circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The customer failed to place a container under the nozzle before payment completed.</li>
            <li>Milk overflowed because the customer provided a container smaller than the selected volume (e.g., selecting 1000ml for a 500ml bottle).</li>
            <li>Spillage resulting from moving or tipping the container while the 12V pump was active.</li>
            <li>Milk spoilage occurring after collection due to unwashed containers or subsequent improper refrigeration at home.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. How to File a Disputed Transaction Claim</h2>
          <p>
            If your account was debited and milk was not dispensed, please quote your <strong>Order ID</strong> (found on the screen or in your Order History) and contact our support desk:
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-1">
            <p><strong>Support Email:</strong> refunds@smartmilkatm.in / support@smartmilkatm.in</p>
            <p><strong>Helpline:</strong> +91 80 4967 8820 (Daily 7:00 AM – 9:00 PM IST)</p>
            <p><strong>Verification Requirement:</strong> Please provide the Order ID and the UPI Transaction Reference Number (RRN).</p>
          </div>
        </section>
      </div>
    </div>
  );
};
