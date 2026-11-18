import React from 'react';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-8 text-xs text-slate-600 leading-relaxed">
        <div className="border-b border-slate-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Legal & Compliance
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Last Updated: November 1, 2026 • Compliant with Indian Information Technology Act & Razorpay Guidelines
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Introduction</h2>
          <p>
            This Privacy Policy governs how <strong>Smart Milk ATM</strong> ("we", "us", "our", or the "Operator") collects, uses, maintains, and discloses personal information gathered from customers utilizing our automated milk vending kiosks and digital ordering web application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Information We Collect</h2>
          <p>
            When you register, place an order, or make an inquiry, we may collect:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Personal Contact Data:</strong> Name, email address, and optional phone number.</li>
            <li><strong>Transaction & Telemetry Records:</strong> Selected milk quantity, order ID, payment status, timestamp, dispensing confirmation, and kiosk terminal identifier.</li>
            <li><strong>Technical Data:</strong> Device IP address, browser type, and interaction timestamps for fraud prevention and error diagnosis.</li>
          </ul>
          <p>
            <em>Note on Payment Credentials:</em> We <strong>never</strong> collect, process, or store sensitive credit/debit card numbers, CVVs, or UPI PINs. All financial transactions are securely executed directly via the Razorpay payment gateway using bank-grade encryption (TLS 1.3 / PCI-DSS Level 1 compliant).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. How We Use Collected Information</h2>
          <p>We use customer data strictly for legitimate operational purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To authorize and verify automated milk dispensing jobs via the ESP32 microcontroller.</li>
            <li>To issue digital invoices and maintain statutory transaction audit trails.</li>
            <li>To process automated refunds in the event of a verified dispensing failure.</li>
            <li>To monitor kiosk stock levels and prevent fraud or replay attacks.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Data Sharing & Third Parties</h2>
          <p>
            We do not sell, trade, or rent personal identification data to marketing agencies. Information is shared only with:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Razorpay Software Private Limited:</strong> To execute payment authorizations and webhook signature verifications.</li>
            <li><strong>Regulatory Authorities:</strong> Where required by applicable Indian law or law enforcement summons.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. Data Retention & Security</h2>
          <p>
            Customer transaction logs are maintained securely in an encrypted audit ledger. Access is restricted to authorized administrative personnel utilizing multi-factor authentication.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">6. Contact Information & Grievance Officer</h2>
          <p>
            In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, for any questions or data grievances, please contact:
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-slate-700">
            <p><strong>Grievance Officer:</strong> Operations Lead, Smart Milk ATM Project</p>
            <p><strong>Email:</strong> privacy@smartmilkatm.in / support@smartmilkatm.in</p>
            <p><strong>Registered Operating Address:</strong> 80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034</p>
          </div>
        </section>
      </div>
    </div>
  );
};
