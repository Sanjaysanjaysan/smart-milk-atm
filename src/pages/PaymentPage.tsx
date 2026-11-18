import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { upsertOrderInFirestore } from '../services/firestoreService';
import {
  DEFAULT_MERCHANT_UPI_ID,
  buildUpiPaymentUri,
  downloadUpiQrPng,
  formatMilkQuantityLabel,
  generateUpiQrDataUrl,
} from '../utils/upiQr';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Smartphone,
  Lock,
  RefreshCw,
  XCircle,
  RotateCcw,
  Check,
  Download,
  Copy,
  ScanLine,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const PaymentPage: React.FC = () => {
  const { currentOrder, setCurrentOrder, navigateTo, pageParams, addToast, config, priceTiers } = useApp();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isFailing, setIsFailing] = useState<boolean>(false);
  const [updatingQty, setUpdatingQty] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes timer
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'razorpay' | 'upi-apps'>('qr');
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'FAILED'>(
    (currentOrder?.paymentStatus as any) || 'PENDING'
  );
  const [failureReason, setFailureReason] = useState<string>('');
  const [isAwaitingCapture, setIsAwaitingCapture] = useState<boolean>(false);
  const [razorpayScriptLoaded, setRazorpayScriptLoaded] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [upiCopied, setUpiCopied] = useState<boolean>(false);
  const [scanInitiated, setScanInitiated] = useState<boolean>(false);

  const orderId = pageParams?.orderId || currentOrder?.orderId;
  const isDemoMode = paymentData?.demoMode ?? config.demoMode;
  const isLiveMode = Boolean(!isDemoMode && paymentData?.liveMode);
  const modeBadgeLabel = isDemoMode
    ? 'DEMO SAFETY LOCK'
    : isLiveMode
    ? 'RAZORPAY LIVE MODE'
    : 'RAZORPAY TEST MODE';

  const merchantUpiId =
    paymentData?.upiId || currentOrder?.upiId || config.merchantUpiId || DEFAULT_MERCHANT_UPI_ID;

  // Load Razorpay Checkout Script
  useEffect(() => {
    loadRazorpayScript().then((loaded) => {
      setRazorpayScriptLoaded(loaded);
    });
  }, []);

  // Initialize Payment Session from Server
  useEffect(() => {
    if (!orderId) {
      navigateTo('buy-milk');
      return;
    }

    const initPayment = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!res.ok) {
          const err = await res.json();
          addToast('error', 'Payment Initialization Failed', err.error || 'Server error');
          return;
        }

        const data = await res.json();
        setPaymentData(data);
      } catch (e: any) {
        addToast('error', 'Network Error', e.message);
      } finally {
        setLoading(false);
      }
    };

    initPayment();
  }, [orderId]);

  const quantityMl = currentOrder?.quantityMl || paymentData?.quantityMl || 500;
  const matchedTier = priceTiers.find((t) => t.quantityMl === quantityMl);
  const amountInr =
    currentOrder?.amountInr ?? paymentData?.amountInr ?? matchedTier?.priceInr ?? Math.round((quantityMl * 60) / 1000);
  const upiPaymentUri = buildUpiPaymentUri(amountInr, merchantUpiId);

  // Dynamically regenerate the real scannable UPI QR code whenever UPI URI / quantity / amount changes
  useEffect(() => {
    let active = true;
    generateUpiQrDataUrl(upiPaymentUri)
      .then((url) => {
        if (active) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
      });
    return () => {
      active = false;
    };
  }, [upiPaymentUri]);

  // Countdown timer for session validity
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Poll authoritative backend status while awaiting Razorpay capture (status: PENDING)
  useEffect(() => {
    if (!orderId || !isAwaitingCapture || paymentStatus !== 'PENDING') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${orderId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.paymentStatus === 'PAID' && data.dispensingAuthorized) {
          setIsAwaitingCapture(false);
          setPaymentStatus('PAID');
          setCurrentOrder(data.order);
          void upsertOrderInFirestore(data.order);
          addToast('success', 'Payment Captured!', 'Payment confirmed by Razorpay. Dispensing authorized.');
          navigateTo('payment-status', { orderId });
        } else if (data.paymentStatus === 'FAILED') {
          setIsAwaitingCapture(false);
          setPaymentStatus('FAILED');
          setFailureReason(data.order?.failureReason || 'Payment failed or expired.');
          setCurrentOrder(data.order);
          void upsertOrderInFirestore(data.order);
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderId, isAwaitingCapture, paymentStatus]);

  // Change quantity directly on the Payment Page (updates backend order + price + Dynamic QR)
  const handleSelectQuantityOnPayment = async (newQtyMl: number) => {
    if (!orderId || paymentStatus === 'PAID' || updatingQty) return;
    if (newQtyMl === quantityMl && paymentStatus === 'PENDING') return;

    try {
      setUpdatingQty(true);
      const res = await fetch(`/api/orders/${orderId}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityMl: newQtyMl }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast('error', 'Quantity Update Failed', data.error || 'Could not update milk quantity');
        return;
      }

      setCurrentOrder(data.order);
      setPaymentData((prev: any) => ({
        ...(prev || {}),
        quantityMl: data.order.quantityMl,
        amountInr: data.order.amountInr,
        amountPaise: data.order.amountPaise,
        upiId: data.upiId || merchantUpiId,
        upiIntentString: data.upiIntentString,
      }));
      setPaymentStatus('PENDING');
      setFailureReason('');
      setScanInitiated(false);
      void upsertOrderInFirestore(data.order);
      addToast(
        'info',
        'QR Code Updated',
        `Updated to ${formatMilkQuantityLabel(data.order.quantityMl)} (₹${data.order.amountInr}) and generated new UPI QR.`
      );
    } catch (err: any) {
      addToast('error', 'Network Error', err.message || 'Could not update order quantity');
    } finally {
      setUpdatingQty(false);
    }
  };

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(merchantUpiId);
      setUpiCopied(true);
      addToast('success', 'UPI ID Copied', `${merchantUpiId} copied to clipboard.`);
      setTimeout(() => setUpiCopied(false), 2500);
    } catch {
      addToast('info', 'Copy UPI ID', `Merchant UPI ID: ${merchantUpiId}`);
    }
  };

  const handleDownloadQr = async () => {
    try {
      await downloadUpiQrPng({
        upiUri: upiPaymentUri,
        upiId: merchantUpiId,
        quantityMl,
        amountInr,
        orderId,
      });
      addToast(
        'success',
        'QR Downloaded',
        `Dynamic UPI QR for ${formatMilkQuantityLabel(quantityMl)} (₹${amountInr}) saved as PNG.`
      );
    } catch (err: any) {
      addToast('error', 'Download Failed', err.message || 'Could not generate QR PNG');
    }
  };

  const handleScanAndPay = () => {
    setScanInitiated(true);
    addToast(
      'info',
      'UPI Payment Intent Opened',
      'Scanning or paying via UPI app does NOT auto-verify payment. For college demo, click SIMULATE PAYMENT after review.'
    );
    // Launch UPI intent link on supported mobile browsers without claiming payment verification
    try {
      window.location.href = upiPaymentUri;
    } catch {
      // Desktop browsers may ignore custom upi:// protocol handlers gracefully
    }
  };

  // Launch Official Razorpay Checkout Modal (Test Mode when DEMO_MODE=false; Live disabled when DEMO_MODE=true)
  const handleLaunchRazorpayCheckout = () => {
    if (isDemoMode || !paymentData || !paymentData.keyId) {
      addToast(
        'info',
        'Demo Safety Lock Active',
        'DEMO_MODE=true is enabled. Real Razorpay charges and Live Mode remain disabled; use SIMULATE PAYMENT for demonstration.'
      );
      return;
    }

    if (!(window as any).Razorpay || !razorpayScriptLoaded) {
      addToast('error', 'SDK Error', 'Razorpay Checkout script is still loading. Please retry in a moment.');
      return;
    }

    const customerName = user?.fullName || currentOrder?.customerName || 'Customer';
    const customerEmail = user?.email || currentOrder?.customerEmail || 'customer@smartmilkatm.in';

    const options = {
      key: paymentData.keyId,
      amount: paymentData.amountPaise,
      currency: 'INR',
      name: 'Smart Milk ATM',
      description: `${quantityMl}ml Fresh Milk (BYOC)`,
      order_id: paymentData.razorpayOrderId,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: '9876543210',
      },
      notes: {
        machineId: currentOrder?.machineId || config.defaultMachineId,
        orderId: orderId,
        upiId: merchantUpiId,
        environment: isLiveMode ? 'LIVE_MODE' : 'TEST_MODE',
      },
      theme: {
        color: '#059669',
      },
      handler: async function (response: any) {
        await handleVerifyBackendSignature({
          orderId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          simulated: false,
        });
      },
      modal: {
        ondismiss: function () {
          addToast('info', 'Checkout Closed', 'You can retry payment or check status below.');
        },
      },
    };

    try {
      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on('payment.failed', async function (failResponse: any) {
        const errorDesc = failResponse?.error?.description || 'Payment rejected by Razorpay';
        await handleReportFailure(errorDesc, failResponse?.error?.code, failResponse?.error?.metadata?.payment_id);
      });
      rzpInstance.open();
    } catch (err: any) {
      addToast('error', 'Checkout Launch Error', err.message);
    }
  };

  // Verify Payment via Secure Server Endpoint
  const handleVerifyBackendSignature = async (payload: {
    orderId: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    simulated: boolean;
  }) => {
    try {
      setIsVerifying(true);
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.status === 202 || result.status === 'PENDING') {
        setPaymentStatus('PENDING');
        setIsAwaitingCapture(true);
        if (result.order) setCurrentOrder(result.order);
        addToast(
          'warning',
          'Payment Pending Capture',
          result.message || 'Payment is authorized and awaiting capture. Checking status automatically...'
        );
        return;
      }

      if (!res.ok) {
        setPaymentStatus('FAILED');
        setFailureReason(result.error || 'Payment signature verification failed.');
        addToast('error', 'Verification Failed', result.error || 'Cryptographic signature mismatch');
        return;
      }

      setIsAwaitingCapture(false);
      setPaymentStatus('PAID');
      setCurrentOrder(result.order);
      void upsertOrderInFirestore(result.order);
      const isSim = Boolean(result.order?.isSimulatedPayment || payload.simulated);
      addToast(
        'success',
        isSim ? 'DEMO PAYMENT Completed' : 'Payment Verified!',
        isSim
          ? 'Simulated demo payment completed (no real money charged). College demonstration water pump authorized.'
          : 'Payment confirmed by backend. Single-use dispensing authorized.'
      );
      navigateTo('payment-status', { orderId: result.order.orderId });
    } catch (e: any) {
      setPaymentStatus('FAILED');
      setFailureReason(e.message);
      addToast('error', 'Verification Error', e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Report and Test Payment Failure (Never authorizes ESP32 or deducts inventory)
  const handleReportFailure = async (reason?: string, code?: string, paymentId?: string) => {
    try {
      setIsFailing(true);
      const desc = reason || 'DEMO PAYMENT failure simulated — ESP32 pump remains locked and inventory untouched';
      const res = await fetch('/api/payments/failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          errorDescription: desc,
          errorCode: code || 'DEMO_PAYMENT_FAILED',
          paymentId: paymentId || `pay_fail_${Date.now()}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentStatus('FAILED');
        setFailureReason(desc);
        setCurrentOrder(data.order);
        void upsertOrderInFirestore(data.order);
        addToast('warning', 'DEMO PAYMENT Marked Failed', 'Pump stays locked and zero inventory was deducted.');
      }
    } catch (e: any) {
      addToast('error', 'Failure Reporting Error', e.message);
    } finally {
      setIsFailing(false);
    }
  };

  const handleRetryPayment = async () => {
    setPaymentStatus('PENDING');
    setFailureReason('');
    setScanInitiated(false);
    try {
      setLoading(true);
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentData(data);
        addToast('info', 'Session Refreshed', 'Ready to test payment or generate QR.');
      }
    } catch (e: any) {
      addToast('error', 'Retry Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 animate-spin mb-4">
          <RefreshCw className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">
          Initializing {isDemoMode ? 'Dynamic UPI QR & Demo Payment' : 'Razorpay Checkout'}...
        </h2>
        <p className="text-xs text-slate-500 mt-1">Generating order & dynamic UPI payment QR code</p>
      </div>
    );
  }

  const currentTimestamp = currentOrder?.createdAt || new Date().toISOString();
  const displayTiers =
    priceTiers.length > 0
      ? priceTiers
      : [
          { id: 'tier-250', quantityMl: 250, label: '250 ml', priceInr: 15, pricePaise: 1500, defaultRunTimeMs: 5000, estimatedPulses: 1125 },
          { id: 'tier-500', quantityMl: 500, label: '500 ml', priceInr: 30, pricePaise: 3000, defaultRunTimeMs: 10000, estimatedPulses: 2250 },
          { id: 'tier-750', quantityMl: 750, label: '750 ml', priceInr: 45, pricePaise: 4500, defaultRunTimeMs: 15000, estimatedPulses: 3375 },
          { id: 'tier-1000', quantityMl: 1000, label: '1 Litre', priceInr: 60, pricePaise: 6000, defaultRunTimeMs: 20000, estimatedPulses: 4500 },
        ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Step Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5" />
            Step 2 of 3: Dynamic UPI QR & Payment ({modeBadgeLabel})
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Smart Milk ATM Payment
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            Order Reference: <span className="font-mono font-bold text-slate-800">{orderId}</span> • UPI ID:{' '}
            <span className="font-mono font-bold text-emerald-700">{merchantUpiId}</span>
          </p>
        </div>

        {/* Quantity Quick-Selector Bar (Recalculates amount & regenerates Dynamic QR immediately) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Milk Quantity (Auto-Updates Price & Dynamic UPI QR)
            </div>
            <div className="text-[11px] font-semibold text-emerald-700">
              Selected: <strong>{formatMilkQuantityLabel(quantityMl)}</strong> — Amount:{' '}
              <strong>₹{amountInr}.00</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {displayTiers.map((tier) => {
              const isSelected = tier.quantityMl === quantityMl;
              return (
                <button
                  key={tier.id}
                  type="button"
                  disabled={paymentStatus === 'PAID' || updatingQty}
                  onClick={() => handleSelectQuantityOnPayment(tier.quantityMl)}
                  className={`p-3 rounded-xl border-2 text-left transition flex items-center justify-between cursor-pointer disabled:opacity-60 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">
                      {tier.quantityMl === 1000 ? '1 Litre' : `${tier.quantityMl} ml`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tier.quantityMl === 1000 ? '1000 ml' : 'Fresh Milk'}
                    </div>
                  </div>
                  <div className={`text-sm font-black ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>
                    ₹{tier.priceInr}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STATUS BANNER */}
        {paymentStatus === 'PAID' ? (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>
                {currentOrder?.isSimulatedPayment || isDemoMode
                  ? 'DEMO PAYMENT COMPLETED — College Demo Dispenser Authorized'
                  : 'PAYMENT SUCCESSFUL — Dispensing Authorized by Server'}
              </span>
            </div>
            <button
              onClick={() => navigateTo('payment-status', { orderId })}
              className="px-3 py-1 bg-white text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-50 transition cursor-pointer"
            >
              Go to Dispenser
            </button>
          </div>
        ) : paymentStatus === 'FAILED' ? (
          <div className="p-4 rounded-2xl bg-rose-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm font-bold">
              <XCircle className="w-5 h-5 text-rose-200" />
              <div>
                <div>PAYMENT FAILED (PUMP LOCKED • ZERO INVENTORY DEDUCTED)</div>
                <div className="text-xs text-rose-100 font-normal">{failureReason || 'Transaction could not be completed.'}</div>
              </div>
            </div>
            <button
              onClick={handleRetryPayment}
              className="px-4 py-2 bg-white text-rose-800 font-bold text-xs rounded-xl hover:bg-rose-50 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Payment
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>
                {isAwaitingCapture
                  ? 'PAYMENT AUTHORIZED — Awaiting Razorpay capture confirmation before dispensing unlocks'
                  : isDemoMode
                  ? 'DEMO SAFETY LOCK ACTIVE — Live Razorpay disabled; explicit confirmation required before ESP32 pump unlocks'
                  : 'PAYMENT PENDING — Complete payment confirmation to authorize milk dispensing'}
              </span>
            </div>
            <span className="font-mono text-[11px] bg-amber-200/80 px-2 py-0.5 rounded font-bold shrink-0">
              {formatTime(timeLeft)}
            </span>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dynamic UPI QR + Payment Options + DEMO PAYMENT */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg space-y-6">
              {/* Payment Method Selector */}
              <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  onClick={() => setSelectedMethod('qr')}
                  className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMethod === 'qr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Dynamic UPI QR
                </button>
                <button
                  onClick={() => setSelectedMethod('razorpay')}
                  className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMethod === 'razorpay' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Razorpay Test Mode
                </button>
                <button
                  onClick={() => setSelectedMethod('upi-apps')}
                  className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMethod === 'upi-apps' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  UPI Intent
                </button>
              </div>

              {/* TAB 1: DYNAMIC UPI QR CODE */}
              {selectedMethod === 'qr' && (
                <div className="flex flex-col items-center text-center space-y-5">
                  <div className="w-full p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Merchant UPI ID
                      </div>
                      <div className="font-mono font-black text-base text-slate-900">{merchantUpiId}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Quantity
                        </div>
                        <div className="font-black text-sm text-emerald-700">
                          {formatMilkQuantityLabel(quantityMl)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Amount
                        </div>
                        <div className="font-black text-lg text-slate-900">₹{amountInr}.00</div>
                      </div>
                    </div>
                  </div>

                  {/* Scannable Generated QR Image */}
                  <div className="relative p-5 bg-white rounded-3xl border-2 border-emerald-500/40 shadow-xl">
                    {qrCodeDataUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={qrCodeDataUrl}
                          alt={`UPI QR Code for ${merchantUpiId} ₹${amountInr}`}
                          className="w-56 h-56 rounded-xl border border-slate-100"
                        />
                      </div>
                    ) : (
                      <div className="w-56 h-56 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                        Generating QR Code...
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-mono text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        QR Valid For: <strong className="text-slate-800">{formatTime(timeLeft)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Standard UPI URI Display */}
                  <div className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Dynamic UPI Payment URI
                    </div>
                    <div className="font-mono text-[11px] text-slate-700 break-all select-all">
                      {upiPaymentUri}
                    </div>
                  </div>

                  {/* Required QR Action Buttons: Download QR, Copy UPI ID, Scan & Pay */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download QR
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {upiCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          Copied UPI ID
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-600" />
                          Copy UPI ID
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleScanAndPay}
                      className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <ScanLine className="w-4 h-4" />
                      Scan &amp; Pay
                    </button>
                  </div>

                  {scanInitiated && (
                    <div className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-left text-[11px] text-blue-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Scan &amp; Pay Initiated (Verification Required):</strong> Opening or scanning the UPI QR code does{' '}
                        <strong>not</strong> automatically verify payment or unlock the dispenser. Real UPI transfers are never marked as verified without actual payment gateway confirmation. For your college demonstration, use the separate <strong>SIMULATE PAYMENT</strong> button below.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RAZORPAY TEST MODE CHECKOUT */}
              {selectedMethod === 'razorpay' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        {isDemoMode
                          ? 'Razorpay Live Disabled (DEMO_MODE=true Safety Lock)'
                          : 'Razorpay Test Mode Integration'}
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black tracking-wide">
                        {modeBadgeLabel}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-900 leading-relaxed">
                      {isDemoMode ? (
                        <>
                          <strong>DEMO_MODE=true</strong> is active and Razorpay Live Mode is strictly disabled so no real payments can occur. Test flows run safely via <strong>SIMULATE PAYMENT</strong> below.
                        </>
                      ) : (
                        <>
                          Click <strong>Pay with Razorpay</strong> to launch the official Razorpay test modal. You can test UPI payments using Razorpay test VPAs or test card numbers.
                        </>
                      )}
                    </p>

                    <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-[11px] text-slate-700 space-y-1">
                      <div className="font-bold text-slate-900">Razorpay Test Credentials Guide:</div>
                      <div>• <strong>UPI Success:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-700 font-bold">success@razorpay</code></div>
                      <div>• <strong>UPI Failure:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-rose-700 font-bold">failure@razorpay</code></div>
                      <div>• <strong>Test Card:</strong> Any 16 digits (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">4111 2222 3333 4444</code>), valid future expiry, OTP: 123456</div>
                    </div>
                  </div>

                  {paymentData?.keyId && !isDemoMode ? (
                    <button
                      onClick={handleLaunchRazorpayCheckout}
                      disabled={isVerifying || paymentStatus === 'PAID'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-emerald-600/25 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Pay with Razorpay (₹{amountInr}.00 Test Mode)</span>
                    </button>
                  ) : (
                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                      <span className="font-bold">Security Lock Active:</span> Razorpay Live checkout and secret keys remain disabled while <code className="font-mono">DEMO_MODE=true</code>. Use the dedicated <strong>DEMO PAYMENT (SIMULATE PAYMENT)</strong> panel below for college demonstration.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DIRECT UPI INTENT LAUNCH */}
              {selectedMethod === 'upi-apps' && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="font-bold text-slate-900">Direct UPI Payment URI ({merchantUpiId})</div>
                    <p className="text-slate-600">
                      Opens your installed UPI app (Google Pay, PhonePe, Paytm, BHIM) with amount{' '}
                      <strong>₹{amountInr}.00</strong> for <strong>{formatMilkQuantityLabel(quantityMl)}</strong>. Note that opening a UPI app does not auto-verify payment.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Google Pay', 'PhonePe', 'Paytm UPI', 'BHIM UPI'].map((appLabel) => (
                      <button
                        key={appLabel}
                        type="button"
                        onClick={handleScanAndPay}
                        className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{appLabel}</div>
                          <div className="text-[10px] text-slate-400">Open UPI Intent (₹{amountInr})</div>
                        </div>
                        <ScanLine className="w-4 h-4 text-blue-600" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DEDICATED DEMO PAYMENT CARD (Separate from Scan & Pay — College Demonstration Only) */}
            <div className="bg-amber-50/90 rounded-3xl p-6 border-2 border-amber-300 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono text-[10px] font-black uppercase tracking-wider">
                      DEMO PAYMENT
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-0.5">
                      College Demonstration Controls (Simulated Only)
                    </h3>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-900">
                  DEMO_MODE=true
                </span>
              </div>

              <p className="text-xs text-amber-950 leading-relaxed">
                <strong>Important Notice:</strong> Scanning the UPI QR code or clicking Scan &amp; Pay does{' '}
                <strong>not</strong> automatically confirm payment, and real UPI transfers are never marked verified without real gateway confirmation. Use <strong>SIMULATE PAYMENT</strong> below to explicitly complete or fail the demo payment and test the ESP32 water-pump safety authorization.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleVerifyBackendSignature({ orderId, simulated: true })}
                  disabled={isVerifying || paymentStatus === 'PAID'}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-2xl transition shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>Simulating Demo Payment...</>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      SIMULATE PAYMENT
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleReportFailure('DEMO PAYMENT failure simulated by user for college demonstration')}
                  disabled={isFailing || paymentStatus === 'PAID'}
                  className="w-full bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-300 font-black py-3.5 px-4 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  {isFailing ? 'Recording Failure...' : 'Simulate Payment Failure'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Order Details & Real-Time Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Order Breakdown</h3>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  {modeBadgeLabel}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Selected Item:</span>
                  <span className="font-bold text-slate-900">Farm Chilled Milk</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Selected Quantity:</span>
                  <span className="font-bold text-emerald-700">{formatMilkQuantityLabel(quantityMl)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>UPI ID:</span>
                  <span className="font-mono font-bold text-slate-900">{merchantUpiId}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Order Reference:</span>
                  <span className="font-mono text-slate-800 font-bold">{orderId}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Payment Type:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {currentOrder?.isSimulatedPayment === false && currentOrder?.paymentStatus === 'PAID'
                      ? 'VERIFIED GATEWAY'
                      : 'DEMO SIMULATION'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Payment Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : paymentStatus === 'FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {paymentStatus === 'PAID'
                      ? currentOrder?.isSimulatedPayment || isDemoMode
                        ? 'DEMO PAID'
                        : 'PAID / CAPTURED'
                      : paymentStatus}
                  </span>
                </div>

                {paymentData?.razorpayPaymentId || currentOrder?.razorpayPaymentId ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Payment ID:</span>
                    <span className="font-mono text-slate-800 text-[11px] truncate max-w-[150px]">
                      {paymentData?.razorpayPaymentId || currentOrder?.razorpayPaymentId}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between text-slate-600">
                  <span>Date &amp; Time:</span>
                  <span className="text-slate-800 text-[11px]">
                    {new Date(currentTimestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Machine ID:</span>
                  <span className="font-mono text-slate-800">{currentOrder?.machineId || config.defaultMachineId}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-black text-slate-900">
                  <span>Total Amount:</span>
                  <span className="text-emerald-700 text-lg">₹{amountInr}.00</span>
                </div>
              </div>
            </div>

            {/* Security & ESP32 Guarantee Box */}
            <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-5 h-5" />
                <span>ESP32 Pump &amp; Inventory Protections</span>
              </div>
              <ul className="space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li>• ESP32 water pump remains LOCKED until payment confirmation completes.</li>
                <li>• Scanning the UPI QR code never auto-unlocks hardware dispensing.</li>
                <li>• Hardware max-runtime safety timeout &amp; inventory checks stay active.</li>
                <li>• Zero inventory is deducted on failed or uncompleted dispensing.</li>
              </ul>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                Connected to ESP32 Dispenser on GPIO 26 (active-LOW relay).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

