import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Droplets,
  CreditCard,
  ShieldCheck,
  Recycle,
  RotateCcw,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'usage' | 'payment' | 'hygiene' | 'refund';
}

export const FAQPage: React.FC = () => {
  const { navigateTo } = useApp();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      category: 'usage',
      question: 'What kind of container should I bring to the Smart Milk ATM?',
      answer: 'You should bring a thoroughly washed, clean, and sanitized food-grade container such as a stainless steel milk can (doli), food-safe glass bottle, or BPA-free vessel. Ensure the opening is wide enough to sit comfortably beneath the dispensing nozzle without touching it directly.',
    },
    {
      category: 'payment',
      question: 'How do digital UPI payments work at the kiosk?',
      answer: 'After selecting your desired milk volume on the screen, a dynamic Razorpay UPI QR code is generated. You can scan it using any authorized UPI application (Google Pay, PhonePe, Paytm, BHIM, or banking apps). Once payment is captured and verified by our backend server, dispensing begins automatically.',
    },
    {
      category: 'refund',
      question: 'What happens if payment succeeds but milk is not dispensed due to a machine error?',
      answer: 'Our system maintains an immutable cryptographic audit log. If a transaction is marked PAID but the ESP32 flow sensor detects no milk flow or the tank is empty, the order is automatically flagged as FAILED. The backend initiates a refund to the original source bank account via Razorpay within 5 to 7 working days. You can also view the status in the Order History section.',
    },
    {
      category: 'hygiene',
      question: 'How is the milk kept fresh and sanitary?',
      answer: 'The milk is stored in an insulated, double-jacketed food-grade SS304 stainless steel tank equipped with a continuous micro-chilling unit maintaining temperatures strictly between 2°C and 4°C. The internal piping undergoes automated Clean-In-Place (CIP) sanitation.',
    },
    {
      category: 'usage',
      question: 'Can I stop the milk pump in an emergency?',
      answer: 'Yes! Both a physical emergency push button on the kiosk panel and an on-screen "Emergency Stop" button on the customer dispensing page instantly cut power to the 12V pump relay.',
    },
    {
      category: 'payment',
      question: 'Can the pump be activated without completing payment?',
      answer: 'No. Dispensing commands require a cryptographic single-use token (DSP-AUTH) generated strictly on our secure backend after Razorpay webhook verification. The pump cannot be activated by frontend manipulation or screenshot spoofing.',
    },
    {
      category: 'usage',
      question: 'Why does the project discourage single-use milk pouches?',
      answer: 'Multilayer plastic milk pouches cannot be easily separated and recycled. Most end up clogging urban stormwater drainage or polluting water bodies. Bringing your own container directly eliminates pouch packaging waste at the source.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) => activeCategory === 'all' || f.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Knowledge Base & Troubleshooting
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Frequently Asked Questions
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Everything you need to know about purchasing milk, bringing reusable containers, and transaction safety.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-bold">
          {[
            { id: 'all', label: 'All Questions' },
            { id: 'usage', label: 'Vending & Containers' },
            { id: 'payment', label: 'UPI & Razorpay' },
            { id: 'refund', label: 'Refunds & Safety' },
            { id: 'hygiene', label: 'Milk Quality & Chilling' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-slate-900 text-sm cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions? */}
        <div className="bg-slate-900 text-white rounded-3xl p-8 text-center space-y-4 border border-slate-800">
          <h3 className="text-xl font-bold">Still have questions or need technical support?</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Our engineering and kiosk operations team is on call to assist with transaction reconciliations or machinery issues.
          </p>
          <button
            onClick={() => navigateTo('contact-us')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            Contact Customer Support
          </button>
        </div>
      </div>
    </div>
  );
};
