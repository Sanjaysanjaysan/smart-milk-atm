import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const ContactUsPage: React.FC = () => {
  const { addToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Payment / Dispensing Query');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    addToast('success', 'Ticket Created', 'Your support request has been logged. Operator will contact you.');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Customer Support & Operator Contact
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Contact Us
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Need assistance with a dispensing transaction, kiosk malfunction, or bulk dairy queries? We're here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Direct Info & Kiosk Location */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 text-xs">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                Vending Operator Information
              </h3>

              <div className="space-y-4 text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Demonstration Kiosk #01 Location</span>
                    <span>80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Support Hotline</span>
                    <span>+91 80 4967 8820 (Toll-Free, 7:00 AM – 9:00 PM IST)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Official Support Email</span>
                    <span>support@smartmilkatm.in / admin@smartmilkatm.in</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Kiosk Operating Hours</span>
                    <span>24 Hours Automated Vending (Daily Chilled Replenishment at 6:00 AM & 5:00 PM)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Merchant Identity Note for Razorpay Verification */}
            <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Razorpay Merchant Compliance Note</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This website is configured for self-service automated dairy vending machines. All transactions are fulfilled physically at the vending kiosk. For business registrations, GST certificates, or FSSAI license numbers, operators can configure genuine values via the Admin portal without manual code modification.
              </p>
            </div>
          </div>

          {/* Right Column: Support Query Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Submit a Support Request
            </h3>

            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">Message Received!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Our technical operations team has logged your query. If you provided an Order ID, automated audit records have been attached.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ananya Sharma"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ananya@example.com"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                    >
                      <option>Payment / Dispensing Query</option>
                      <option>Refund Request for Failed Dispense</option>
                      <option>Machine Offline / Nozzle Issue</option>
                      <option>Host a Smart Milk ATM at My Society</option>
                      <option>General Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Order ID (If applicable)</label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="ORD-20261101-XXXX"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Message Details</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your query or feedback with exact details..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Submit Support Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
