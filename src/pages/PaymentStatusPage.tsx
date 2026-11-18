import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  ArrowRight,
  KeyRound,
  RotateCw,
  Clock,
  XCircle,
  RotateCcw,
} from 'lucide-react';

export const PaymentStatusPage: React.FC = () => {
  const { currentOrder, setCurrentOrder, navigateTo, pageParams } = useApp();
  const [countdown, setCountdown] = useState<number>(3);
  const [orderData, setOrderData] = useState<any>(currentOrder);

  const orderId = pageParams?.orderId || currentOrder?.orderId;

  // Poll authoritative payment status until PAID or FAILED
  useEffect(() => {
    if (!orderId) {
      navigateTo('home');
      return;
    }

    const fetchOrderStatus = async () => {
      try {
        const res = await fetch(`/api/payments/${orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          setOrderData(data.order);
          setCurrentOrder(data.order);
        }
      } catch {
        // fallback
      }
    };

    fetchOrderStatus();

    const poll = setInterval(() => {
      if (orderData?.paymentStatus === 'PENDING' || !orderData) {
        fetchOrderStatus();
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [orderId, orderData?.paymentStatus]);

  // Auto transition to dispensing screen ONLY when backend confirms PAID
  useEffect(() => {
    if (orderData?.paymentStatus !== 'PAID') return;

    if (countdown <= 0) {
      navigateTo('dispensing-status', { orderId });
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, orderId, orderData?.paymentStatus]);

  const status = orderData?.paymentStatus || 'PENDING';
  const isSimulatedOrder =
    orderData?.isSimulatedPayment === true ||
    orderData?.gatewayMode === 'DEMO_SIMULATION' ||
    (orderData?.razorpayPaymentId || '').startsWith('pay_sim_') ||
    (orderData?.razorpayPaymentId || '').startsWith('pay_Demo') ||
    (orderData?.orderId || '').startsWith('order_sim_') ||
    (orderData?.orderId || '').startsWith('order_Demo');

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
        {status === 'PAID' ? (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative mx-auto w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-600/20 animate-bounce">
              <div className="w-18 h-18 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white stroke-[2.5]" />
              </div>
            </div>

            <div>
              <span className={`text-xs font-bold uppercase tracking-widest ${isSimulatedOrder ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isSimulatedOrder ? 'Simulated Demo Payment Verified' : 'Payment Captured & Verified'}
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                {isSimulatedOrder ? 'DEMO PAYMENT COMPLETE!' : 'PAYMENT SUCCESSFUL!'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {isSimulatedOrder
                  ? 'Demo-mode simulated transaction confirmed (no real money was charged).'
                  : 'Your transaction has been cryptographically confirmed by the backend.'}
              </p>
            </div>
          </>
        ) : status === 'FAILED' ? (
          <>
            <div className="relative mx-auto w-24 h-24 rounded-full bg-rose-100 flex items-center justify-center shadow-lg shadow-rose-600/15">
              <div className="w-18 h-18 rounded-full bg-rose-500 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-white stroke-[2.5]" />
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-rose-600">
                Payment Verification Failed
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                PAYMENT FAILED
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {orderData?.failureReason || 'Transaction was declined or cancelled. Dispensing remains locked.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative mx-auto w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center shadow-lg shadow-amber-600/15">
              <div className="w-18 h-18 rounded-full bg-amber-500 flex items-center justify-center">
                <Clock className="w-12 h-12 text-white stroke-[2.5]" />
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Awaiting Final Capture
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                PAYMENT PENDING
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Checking Razorpay capture status. Dispensing unlocks automatically once captured.
              </p>
            </div>
          </>
        )}

        {/* Verification Summary Box */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-left space-y-2.5">
          <div className="flex justify-between items-center text-slate-600">
            <span>Amount:</span>
            <span className="font-bold text-slate-900 text-sm">₹{orderData?.amountInr || 30}.00</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Selected Quantity:</span>
            <span className="font-bold text-emerald-700 text-sm">{orderData?.quantityMl || 500} ml</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Order Reference:</span>
            <span className="font-mono text-slate-800 font-bold">{orderId}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Payment Status:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                status === 'PAID'
                  ? isSimulatedOrder
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                  : status === 'FAILED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {status === 'PAID' ? (isSimulatedOrder ? 'Simulated Paid (Demo Mode)' : 'Payment Verified (PAID)') : status}
            </span>
          </div>

          {status === 'PAID' && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-emerald-600" />
                Auth Token:
              </span>
              <span className="font-mono text-slate-700 truncate max-w-[170px]">
                {orderData?.dispensingToken || 'DSP-AUTH-SECURE-TOKEN'}
              </span>
            </div>
          )}
        </div>

        {status === 'PAID' ? (
          <>
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 flex items-center gap-2.5 justify-center">
              <RotateCw className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="font-bold">
                Preparing your milk... Redirecting to dispenser in {countdown}s
              </span>
            </div>

            <button
              onClick={() => navigateTo('dispensing-status', { orderId })}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-600/25 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Dispenser Screen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : status === 'FAILED' ? (
          <button
            onClick={() => navigateTo('payment', { orderId })}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-rose-600/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Payment</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5 justify-center">
            <RotateCw className="w-4 h-4 text-amber-600 animate-spin" />
            <span className="font-bold">
              Waiting for Razorpay capture confirmation...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
