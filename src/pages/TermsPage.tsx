import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-8 text-xs text-slate-600 leading-relaxed">
        <div className="border-b border-slate-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Legal & Compliance
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Terms and Conditions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Effective Date: November 1, 2026 • Governing Self-Service Automated Milk Vending
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing this web platform, initiating an order, scanning a payment QR code, or collecting milk from any Smart Milk ATM kiosk, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Self-Service Nature & BYOC (Bring Your Own Container) Requirement</h2>
          <p>
            Smart Milk ATM operates strictly on a <strong>self-service, on-site physical kiosk pickup model</strong>. Home delivery is not provided.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Customer Container Responsibility:</strong> Customers are solely responsible for providing their own food-grade, clean, sanitized, and structurally sound container capable of holding the purchased volume.</li>
            <li><strong>Sanitary Placement:</strong> Customers must place the container securely under the dispensing nozzle prior to completing payment.</li>
            <li><strong>No Liability for Container Spill or Contamination:</strong> The Operator bears no liability for milk spillage or spoilage resulting from unhygienic, undersized, or improperly positioned customer containers.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. Pricing & Payment Verification</h2>
          <p>
            All milk prices displayed are calculated per milliliter and verified strictly by our server-side price matrix. Payment must be successfully captured via authorized Razorpay UPI or digital gateways before dispensing commands are issued to the microcontroller.
          </p>
          <p>
            We strictly reject fraudulent payment claims, edited screenshot receipts, or unauthorized attempts to trip the relay without backend cryptographic authorization.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Machine Availability & Emergency Cutoffs</h2>
          <p>
            While kiosks are designed for 24/7 autonomous operation, service may be temporarily suspended during routine milk tank replenishment, automated CIP sanitization cycles, or technical maintenance. Customers must not attempt to force nozzle actuation during machine maintenance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. Governing Law & Jurisdiction</h2>
          <p>
            These terms are governed by and construed in accordance with the laws of India. Any disputes arising out of the use of Smart Milk ATM kiosks shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka.
          </p>
        </section>
      </div>
    </div>
  );
};
