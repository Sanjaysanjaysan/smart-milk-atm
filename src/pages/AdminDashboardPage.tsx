import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { saveMachineLocationToFirestore, isFirebaseSessionReady } from '../services/firestoreService';
import {
  Shield,
  Activity,
  DollarSign,
  Droplets,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Save,
  FileText,
  Lock,
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Edit3,
  Globe,
  Radio,
  PlusCircle,
  Receipt,
  Search,
  X,
  Sparkles,
  Download,
  CreditCard,
} from 'lucide-react';
import { MilkTier, Order, MilkBatch, StockRefill, StockTransaction, InventorySummary } from '../types';
import { downloadReceiptPdf } from '../utils/receiptGenerator';
import { jsPDF } from 'jspdf';
import {
  UserCheck,
  Layers,
  FileSpreadsheet,
  Check,
  Ban,
  UserX,
  KeyRound,
  Copy,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { machine, priceTiers, emergencyStop, resetEmergency, refreshMachine, addToast, navigateTo, config } = useApp();
  const { user, isAdmin, loginAsDemoUser, getAuthHeader } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refillAmount, setRefillAmount] = useState<number>(20);
  const [isRefilling, setIsRefilling] = useState<boolean>(false);

  // Tab Navigation: All Orders, Completed, Dispensing, Pending Dispense, Failed, RAZORPAY, LOCATION, INVENTORY, STAFF
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'DISPENSING' | 'PENDING_DISPENSE' | 'FAILED' | 'RAZORPAY' | 'LOCATION' | 'INVENTORY' | 'STAFF'>('ALL');
  const [razorpayFilter, setRazorpayFilter] = useState<'ALL' | 'PAID' | 'FAILED' | 'PENDING'>('ALL');

  // Orders list state for order tabs
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Inventory & Batch Management State
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [batches, setBatches] = useState<MilkBatch[]>([]);
  const [refills, setRefills] = useState<StockRefill[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(machine?.minStockThresholdLiters || 5);
  const [isSavingThreshold, setIsSavingThreshold] = useState<boolean>(false);

  // Staff Management State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);
  const [adminInviteCode, setAdminInviteCode] = useState<string>('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState<boolean>(false);

  // Editable Calibration & Pricing state
  const [editableTiers, setEditableTiers] = useState<MilkTier[]>(priceTiers);
  const [pulsesPerMl, setPulsesPerMl] = useState<number>(machine?.pulsesPerMl || 4.5);
  const [maxRuntimeMs, setMaxRuntimeMs] = useState<number>(machine?.maxRuntimeMs || 25000);
  const [relayActiveLow, setRelayActiveLow] = useState<boolean>(machine?.relayActiveLow ?? true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Location Tab State & Editing Form
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [locName, setLocName] = useState<string>(machine?.name || 'Koramangala Dairy Kiosk #01');
  const [locAddress, setLocAddress] = useState<string>(machine?.location || '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034');
  const [locLatitude, setLocLatitude] = useState<string>(machine?.latitude !== null && machine?.latitude !== undefined ? String(machine.latitude) : '12.9343');
  const [locLongitude, setLocLongitude] = useState<string>(machine?.longitude !== null && machine?.longitude !== undefined ? String(machine.longitude) : '77.6256');
  const [isSavingLocation, setIsSavingLocation] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await fetch('/api/orders', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // fallback
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory/summary', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setInventorySummary(data.summary);
        setBatches(data.batches || []);
        setRefills(data.refills || []);
        setTransactions(data.transactions || []);
      }
    } catch {
      // fallback
    }
  };

  const fetchStaff = async () => {
    try {
      setStaffLoading(true);
      const res = await fetch('/api/admin/staff', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch {
      // fallback
    } finally {
      setStaffLoading(false);
    }
  };

  const handleStaffAction = async (uid: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE') => {
    try {
      const res = await fetch('/api/admin/staff/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ uid, action }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Staff Status Updated', data.message);
        fetchStaff();
      } else {
        addToast('error', 'Action Failed', data.error || 'Server rejected request');
      }
    } catch (e: any) {
      addToast('error', 'Network Error', e.message);
    }
  };

  const handleSaveThreshold = async () => {
    try {
      setIsSavingThreshold(true);
      const res = await fetch('/api/inventory/threshold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ minStockThresholdLiters: Number(lowStockThreshold) }),
      });
      if (res.ok) {
        addToast('success', 'Threshold Saved', `Low stock threshold set to ${lowStockThreshold} Litres.`);
        await refreshMachine();
        await fetchInventory();
      }
    } catch (e: any) {
      addToast('error', 'Error', e.message);
    } finally {
      setIsSavingThreshold(false);
    }
  };

  const handleGenerateAdminInvite = async () => {
    try {
      setIsGeneratingInvite(true);
      const res = await fetch('/api/admin/invites/generate', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (res.ok && data.inviteToken) {
        setAdminInviteCode(data.inviteToken);
        addToast('success', 'Invite Token Generated', data.inviteToken);
      }
    } catch (e: any) {
      addToast('error', 'Error', e.message);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleExportInventoryCsv = async () => {
    try {
      const res = await fetch('/api/inventory/export', {
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast('error', 'Export Failed', err.error || 'Admin or staff authentication required.');
        return;
      }
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'milk_inventory_report.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'CSV Exported', 'Inventory audit CSV downloaded.');
    } catch (e: any) {
      addToast('error', 'Export Error', e.message);
    }
  };

  const handleExportInventoryPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SMART MILK ATM - INVENTORY AUDIT REPORT', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`Kiosk ID: ${machine?.machineId || 'ATM-KA-001'} - ${machine?.name || ''}`, 14, 34);
      doc.text(`Current Stock: ${machine?.currentStockLiters?.toFixed(1) || '0'} Litres / ${machine?.tankCapacityLiters || 100} L`, 14, 40);
      doc.text(`Low Stock Threshold: ${machine?.minStockThresholdLiters || 5} Litres`, 14, 46);

      let yPos = 56;
      doc.setFont('helvetica', 'bold');
      doc.text('ACTIVE BATCHES (FIRST EXPIRED, FIRST OUT):', 14, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.text('Batch Number', 14, yPos);
      doc.text('Supplier', 55, yPos);
      doc.text('Remaining (L)', 110, yPos);
      doc.text('Expiry Date', 145, yPos);
      doc.text('Status', 180, yPos);
      yPos += 4;
      doc.line(14, yPos, 196, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      batches.slice(0, 15).forEach((b) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(b.batchNumber, 14, yPos);
        doc.text(b.supplierName.slice(0, 26), 55, yPos);
        doc.text(`${b.remainingLitres.toFixed(1)} / ${b.receivedLitres}`, 110, yPos);
        doc.text(b.expiryDate, 145, yPos);
        doc.text(b.status, 180, yPos);
        yPos += 6;
      });

      doc.save(`milk_inventory_audit_${new Date().toISOString().slice(0, 10)}.pdf`);
      addToast('success', 'PDF Report Generated', 'Inventory audit report downloaded.');
    } catch (e: any) {
      addToast('error', 'PDF Error', e.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchOrders();
    fetchInventory();
    fetchStaff();
    const interval = setInterval(() => {
      fetchStats();
      fetchOrders();
      fetchInventory();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setEditableTiers(priceTiers);
  }, [priceTiers]);

  useEffect(() => {
    if (machine) {
      setPulsesPerMl(machine.pulsesPerMl);
      setMaxRuntimeMs(machine.maxRuntimeMs);
      setRelayActiveLow(machine.relayActiveLow);
      setLocName(machine.name || '');
      setLocAddress(machine.location || '');
      setLocLatitude(machine.latitude !== null && machine.latitude !== undefined ? String(machine.latitude) : '');
      setLocLongitude(machine.longitude !== null && machine.longitude !== undefined ? String(machine.longitude) : '');
    }
  }, [machine]);

  const handleRefill = async () => {
    try {
      setIsRefilling(true);
      const res = await fetch('/api/admin/refill-tank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ liters: refillAmount }),
      });
      if (res.ok) {
        addToast('success', 'Tank Refilled', `Added ${refillAmount} Liters of milk to storage vessel.`);
        await refreshMachine();
        await fetchStats();
      } else {
        const err = await res.json().catch(() => ({}));
        addToast('error', 'Refill Failed', err.error || 'Admin authorization required');
      }
    } catch (e: any) {
      addToast('error', 'Refill Failed', e.message);
    } finally {
      setIsRefilling(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          tiers: editableTiers,
          pulsesPerMl: Number(pulsesPerMl),
          maxRuntimeMs: Number(maxRuntimeMs),
          relayActiveLow: Boolean(relayActiveLow),
        }),
      });

      if (res.ok) {
        addToast('success', 'Configuration Saved', 'Server-side pricing and ESP32 calibration updated.');
        await refreshMachine();
      } else {
        const err = await res.json().catch(() => ({}));
        addToast('error', 'Config Error', err.error || 'Admin authorization required');
      }
    } catch (e: any) {
      addToast('error', 'Config Error', e.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingLocation(true);
      const res = await fetch('/api/admin/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: locName,
          location: locAddress,
          latitude: locLatitude ? Number(locLatitude) : null,
          longitude: locLongitude ? Number(locLongitude) : null,
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        if (isFirebaseSessionReady() && resData.machine) {
          void saveMachineLocationToFirestore(resData.machine);
        }
        addToast('success', 'Location Saved', 'Kiosk location and GPS coordinates saved.');
        setIsEditingLocation(false);
        await refreshMachine();
        await fetchStats();
      } else {
        const err = await res.json();
        addToast('error', 'Update Failed', err.error || 'Failed to save location');
      }
    } catch (err: any) {
      addToast('error', 'Network Error', err.message);
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleGetDirections = () => {
    if (machine?.latitude !== null && machine?.latitude !== undefined && machine?.longitude !== null && machine?.longitude !== undefined) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${machine.latitude},${machine.longitude}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (machine?.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(machine.location)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      addToast('warning', 'Location Not Configured', 'Please configure latitude and longitude first.');
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderId.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'COMPLETED') return o.dispensingStatus === 'COMPLETED';
    if (activeTab === 'DISPENSING') return o.dispensingStatus === 'DISPENSING';
    if (activeTab === 'PENDING_DISPENSE') return o.dispensingStatus === 'PENDING_DISPENSE' || (o.paymentStatus === 'PAID' && o.dispensingStatus !== 'COMPLETED');
    if (activeTab === 'FAILED') return o.dispensingStatus === 'FAILED' || o.paymentStatus === 'FAILED';
    return true; // 'ALL'
  });

  // Dedicated filtering for Razorpay Payment Management section
  const razorpayFilteredOrders = orders.filter((o) => {
    const query = orderSearchQuery.toLowerCase();
    const matchesSearch =
      o.orderId.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query) ||
      o.customerEmail.toLowerCase().includes(query) ||
      (o.razorpayPaymentId && o.razorpayPaymentId.toLowerCase().includes(query)) ||
      (o.razorpayOrderId && o.razorpayOrderId.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (razorpayFilter === 'PAID') return o.paymentStatus === 'PAID';
    if (razorpayFilter === 'FAILED') return o.paymentStatus === 'FAILED';
    if (razorpayFilter === 'PENDING') return o.paymentStatus === 'PENDING';
    return true;
  });

  const hasValidCoordinates =
    machine?.latitude !== null &&
    machine?.latitude !== undefined &&
    !isNaN(Number(machine.latitude)) &&
    machine?.longitude !== null &&
    machine?.longitude !== undefined &&
    !isNaN(Number(machine.longitude));

  const pendingStaffCount = staffList.filter((s) => s.approvalStatus === 'PENDING').length;
  const activeBatchesCount = batches.filter((b) => b.status === 'ACTIVE' && b.remainingLitres > 0).length;

  const isDemoMode = stats?.demoMode ?? config.demoMode;
  const isLiveGateway = !isDemoMode && (stats?.razorpayMode === 'LIVE' || config.razorpayMode === 'LIVE');
  const envBadgeLabel = isDemoMode ? 'DEMO SAFE LOCK' : isLiveGateway ? 'LIVE MODE' : 'TEST MODE';
  const readiness = stats?.readinessChecks || {};

  const navTabs: { id: 'ALL' | 'COMPLETED' | 'DISPENSING' | 'PENDING_DISPENSE' | 'FAILED' | 'RAZORPAY' | 'LOCATION' | 'INVENTORY' | 'STAFF'; label: string; icon?: any; badge?: number | string }[] = [
    { id: 'ALL', label: 'All Orders', badge: stats?.totalOrders ?? orders.length },
    { id: 'COMPLETED', label: 'Completed', badge: stats?.completedDispenses },
    { id: 'DISPENSING', label: 'Dispensing', badge: orders.filter((o) => o.dispensingStatus === 'DISPENSING').length },
    { id: 'PENDING_DISPENSE', label: 'Pending Dispense', badge: orders.filter((o) => o.dispensingStatus === 'PENDING_DISPENSE').length },
    { id: 'FAILED', label: 'Failed', badge: stats?.failedDispenses },
    { id: 'RAZORPAY', label: 'RAZORPAY PAYMENTS', icon: CreditCard, badge: stats?.capturedPayments !== undefined ? `${stats.capturedPayments} Paid` : envBadgeLabel },
    { id: 'LOCATION', label: 'LOCATION', icon: MapPin, badge: 'Live GPS' },
    { id: 'INVENTORY', label: 'INVENTORY', icon: Layers, badge: `${activeBatchesCount} Batches` },
    { id: 'STAFF', label: 'STAFF', icon: UserCheck, badge: pendingStaffCount > 0 ? `${pendingStaffCount} NEW` : staffList.length },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">Kiosk Fleet Admin & Telemetry</h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                  Protected System Console
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time ESP32 hardware supervision, server-side pricing control, and Razorpay transaction settlement.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('LOCATION')}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LOCATION'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-500" />
              Kiosk Location & Map
            </button>

            {!isAdmin ? (
              <button
                onClick={() => loginAsDemoUser('admin')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Switch to Admin Mode
              </button>
            ) : (
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-4 h-4" /> Admin Access Granted
                </span>
                <span className="text-[11px] text-slate-400">{user?.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Executive KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
              <span>Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              ₹{stats?.totalRevenueInr ?? 90}.00
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold">
              Captured via Razorpay UPI & Webhooks
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
              <span>Total Orders</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {stats?.totalOrders ?? 2}
            </div>
            <p className="text-[11px] text-slate-500">
              {stats?.paidOrders ?? 2} Paid • {stats?.pendingOrders ?? 0} Pending
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
              <span>Successful Dispenses</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-600">
              {stats?.completedDispenses ?? 2}
            </div>
            <p className="text-[11px] text-slate-500">
              Zero failure rate • {stats?.failedDispenses ?? 0} Errored
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
              <span>Milk Stock In Tank</span>
              <Droplets className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {machine?.currentStockLiters ?? 84.5} <span className="text-sm font-bold text-slate-400">/ 100 L</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Temp: <strong className="text-blue-600">{machine?.temperatureCelsius ?? 3.8}°C</strong> • CIP Valid
            </p>
          </div>
        </div>

        {/* Machine Status & Emergency Kill-Switch Bar */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full ${
                  machine?.status === 'READY' ? 'bg-emerald-500 animate-pulse' :
                  machine?.status === 'EMERGENCY_STOP' ? 'bg-red-600' : 'bg-amber-500'
                }`} />
                <h3 className="text-xl font-black text-slate-900">
                  Kiosk #{machine?.machineId || 'ATM-KA-001'} — {machine?.status || 'ONLINE'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Firmware: <span className="font-mono">{machine?.firmwareVersion}</span> • IP: <span className="font-mono">{machine?.ipAddress}</span> • Last Heartbeat: {new Date(machine?.lastHeartbeat || Date.now()).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {machine?.status === 'EMERGENCY_STOP' ? (
                <button
                  onClick={resetEmergency}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Emergency Stop & Reset Ready
                </button>
              ) : (
                <button
                  onClick={emergencyStop}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-red-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  EMERGENCY STOP (CUT ALL PUMPS)
                </button>
              )}
            </div>
          </div>

          {/* Quick Milk Refill Control */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div>
              <h4 className="font-bold text-slate-900">Restock / Refill Raw Milk Storage Vessel</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Simulates dairy cooperative tanker replenishment into the insulated kiosk tank.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="number"
                min="5"
                max="100"
                value={refillAmount}
                onChange={(e) => setRefillAmount(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs"
              />
              <span className="text-slate-600 font-bold">Liters</span>

              <button
                onClick={handleRefill}
                disabled={isRefilling}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {isRefilling ? 'Refilling...' : 'Refill Tank'}
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* NAVIGATION TABS: All Orders, Completed, Dispensing, Pending, Failed, LOCATION */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Operations Center
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">
                Kiosk Orders & Location Management
              </h3>
            </div>

            {/* Navigation Tabs Bar with Location Icon */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const isLocation = tab.id === 'LOCATION';

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? isLocation
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-900 text-white shadow-sm'
                        : isLocation
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.icon && <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-600'}`} />}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : isLocation
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* TAB CONTENT: LOCATION TAB */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'LOCATION' && (
            <div className="space-y-6">
              {/* Location Summary Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Kiosk Name & Connection Status */}
                <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{machine?.name || 'Koramangala Dairy Kiosk #01'}</h4>
                        <span className="font-mono text-xs text-slate-500 font-bold">
                          Machine ID: <span className="text-emerald-700">{machine?.machineId || 'ATM-KA-001'}</span>
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                      machine?.status === 'READY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : machine?.status === 'DISPENSING'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : machine?.status === 'EMERGENCY_STOP'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        machine?.status === 'READY' ? 'bg-emerald-500 animate-pulse' :
                        machine?.status === 'DISPENSING' ? 'bg-blue-500' : 'bg-red-500'
                      }`} />
                      ESP32: {machine?.status || 'ONLINE'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Configured Full Address:</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-xs leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                      {machine?.location || 'Location not configured'}
                    </p>

                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Last Location Update:
                      </span>
                      <span className="font-mono text-slate-700">
                        {machine?.locationUpdatedAt
                          ? new Date(machine.locationUpdatedAt).toLocaleString()
                          : 'Just now (Configured)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates & Actions Card */}
                <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-emerald-600" />
                        GPS Telemetry Coordinates
                      </span>
                      <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                        WGS-84 Datum
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Latitude</span>
                        <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                          {machine?.latitude !== null && machine?.latitude !== undefined
                            ? `${machine.latitude}° N`
                            : 'Location not configured'}
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Longitude</span>
                        <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                          {machine?.longitude !== null && machine?.longitude !== undefined
                            ? `${machine.longitude}° E`
                            : 'Location not configured'}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      * Using manually configured landmark kiosk coordinates saved to Firebase Firestore.
                    </p>
                  </div>

                  {/* Actions: Get Directions & Edit Location */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleGetDirections}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      Get Directions
                    </button>

                    <button
                      onClick={() => setIsEditingLocation(!isEditingLocation)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-slate-600" />
                      {isEditingLocation ? 'Cancel Edit' : 'Edit Location'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Location Form (Admin-Only) */}
              {isEditingLocation && (
                <form
                  onSubmit={handleSaveLocation}
                  className="bg-emerald-50/60 rounded-2xl p-6 border border-emerald-200 space-y-4 text-xs animate-slide-up"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                    <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-emerald-700" />
                      Edit Kiosk Location & GPS Coordinates (Admin)
                    </h4>
                    <span className="text-[11px] text-emerald-800 font-medium">Saves to Firestore</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Kiosk Name</label>
                      <input
                        type="text"
                        required
                        value={locName}
                        onChange={(e) => setLocName(e.target.value)}
                        placeholder="Koramangala Dairy Kiosk #01"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Configured Full Street Address</label>
                      <input
                        type="text"
                        required
                        value={locAddress}
                        onChange={(e) => setLocAddress(e.target.value)}
                        placeholder="80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Actual Latitude (Decimal Degrees)</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locLatitude}
                        onChange={(e) => setLocLatitude(e.target.value)}
                        placeholder="12.9343"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Actual Longitude (Decimal Degrees)</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locLongitude}
                        onChange={(e) => setLocLongitude(e.target.value)}
                        placeholder="77.6256"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingLocation(false)}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingLocation}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingLocation ? 'Saving to Firestore...' : 'Save Location to Firestore'}
                    </button>
                  </div>
                </form>
              )}

              {/* Integrated Google Maps View */}
              <div className="bg-slate-50 rounded-3xl p-4 sm:p-6 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Interactive Google Maps View</h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Marker: <strong className="text-emerald-700">{machine?.name || 'Smart Milk ATM'}</strong> ({machine?.latitude ?? '—'}, {machine?.longitude ?? '—'})
                  </span>
                </div>

                {hasValidCoordinates ? (
                  <div className="relative w-full h-[440px] rounded-2xl overflow-hidden border border-slate-300 shadow-md">
                    {/* Google Map Embedded Frame with genuine coordinates */}
                    <iframe
                      title="Smart Milk ATM Kiosk Google Map"
                      width="100%"
                      height="100%"
                      className="w-full h-full border-0"
                      src={`https://maps.google.com/maps?q=${machine?.latitude},${machine?.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                      loading="lazy"
                      allowFullScreen
                    />

                    {/* Floating Green Google Maps-Style Kiosk Marker Overlay */}
                    <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-lg border border-emerald-500/30 flex items-center gap-3 pointer-events-auto max-w-sm">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <MapPin className="w-6 h-6 fill-current text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block leading-tight">
                          {machine?.name || 'Smart Milk ATM Kiosk'}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold block">
                          Machine ID: {machine?.machineId || 'ATM-KA-001'} • Status: {machine?.status || 'ONLINE'}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[220px]">
                          {machine?.location}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Location not configured</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        GPS coordinates have not been calibrated for this machine. Click "Edit Location" above to enter the kiosk latitude and longitude.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingLocation(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Configure GPS Coordinates
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB CONTENT: INVENTORY MANAGEMENT */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'INVENTORY' && (
            <div className="space-y-6">
              {/* Inventory Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Current Available Stock</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-slate-900">{machine?.currentStockLiters?.toFixed(1) || '0'}</span>
                    <span className="text-xs font-bold text-slate-500">/ {machine?.tankCapacityLiters || 100} L</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full ${
                        (machine?.currentStockLiters ?? 0) <= (machine?.minStockThresholdLiters ?? 5)
                          ? 'bg-red-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round(((machine?.currentStockLiters ?? 0) / (machine?.tankCapacityLiters || 100)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Received Today</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-emerald-700">
                      +{inventorySummary?.totalReceivedTodayLitres?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Litres</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Intake through cold-chain tankers</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Dispensed Today</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-blue-700">
                      {inventorySummary?.totalDispensedTodayLitres?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Litres</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Verified customer bottle fills</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Low Stock Threshold</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-sm"
                    />
                    <span className="text-xs font-bold text-slate-600">Litres</span>
                    <button
                      onClick={handleSaveThreshold}
                      disabled={isSavingThreshold}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      {isSavingThreshold ? '...' : 'Save'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Triggers alert when stock &lt;= threshold</p>
                </div>
              </div>

              {/* Export Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs">Official Milk Inventory Audit Reports</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Download complete historical batch intakes, FEFO ledger deductions, and staff receiving logs.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportInventoryCsv}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-300 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export CSV
                  </button>

                  <button
                    onClick={handleExportInventoryPdf}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-white" />
                    Export PDF Audit
                  </button>
                </div>
              </div>

              {/* Batches Table (FEFO) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      All Milk Batches (FEFO Sorting Engine)
                    </h4>
                    <p className="text-xs text-slate-500">
                      System automatically dispenses from earliest expiring batch first. Expired batches are locked.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-600 px-2.5 py-1 bg-slate-100 rounded-full">
                    {batches.length} Total Batches
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                          <th className="py-3 px-4">Batch #</th>
                          <th className="py-3 px-4">Supplier</th>
                          <th className="py-3 px-4">Remaining</th>
                          <th className="py-3 px-4">Received</th>
                          <th className="py-3 px-4">Expiry Date</th>
                          <th className="py-3 px-4">Intake Temp</th>
                          <th className="py-3 px-4">Receiving Staff</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batches.map((b, idx) => (
                          <tr key={b.batchId} className={idx === 0 && b.status === 'ACTIVE' ? 'bg-emerald-50/30' : ''}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {b.batchNumber}
                              {idx === 0 && b.status === 'ACTIVE' && b.remainingLitres > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white">
                                  ACTIVE FEFO
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-800 font-medium">{b.supplierName}</td>
                            <td className="py-3 px-4 font-extrabold text-emerald-700">
                              {b.remainingLitres.toFixed(1)} L
                            </td>
                            <td className="py-3 px-4 text-slate-600">{b.receivedLitres} L</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{b.expiryDate}</td>
                            <td className="py-3 px-4 text-blue-700 font-bold">
                              {b.storageTemperatureCelsius !== null ? `${b.storageTemperatureCelsius}°C` : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {b.receivedByStaffName} ({b.receivedByStaffId})
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.status === 'EXHAUSTED'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Refill Log Audit Trail */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 text-sm">Immutable Milk Refill Audit History</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                          <th className="py-3 px-4">Refill ID</th>
                          <th className="py-3 px-4">Batch Number</th>
                          <th className="py-3 px-4">Supplier</th>
                          <th className="py-3 px-4">Volume (L)</th>
                          <th className="py-3 px-4">Receiving Staff</th>
                          <th className="py-3 px-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {refills.map((r) => (
                          <tr key={r.refillId}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.refillId}</td>
                            <td className="py-3 px-4 font-mono text-slate-700">{r.batchNumber}</td>
                            <td className="py-3 px-4 text-slate-800">{r.supplierName}</td>
                            <td className="py-3 px-4 font-bold text-emerald-700">+{r.quantityLitres} L</td>
                            <td className="py-3 px-4 text-slate-700">{r.staffName} ({r.staffId})</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {new Date(r.refillTimestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB CONTENT: STAFF MANAGEMENT */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'STAFF' && (
            <div className="space-y-6">
              {/* Admin Invite Token Generator Card */}
              <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-700" />
                    Administrator Invite Token Provisioning
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Generate a single-use authorization token to onboard a trusted dairy administrator without public registration.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {adminInviteCode && (
                    <div className="px-3 py-1.5 bg-white border border-blue-300 rounded-xl font-mono font-bold text-xs text-blue-900 select-all">
                      {adminInviteCode}
                    </div>
                  )}
                  <button
                    onClick={handleGenerateAdminInvite}
                    disabled={isGeneratingInvite}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    {isGeneratingInvite ? 'Generating...' : 'Generate Admin Invite'}
                  </button>
                </div>
              </div>

              {/* Pending Staff Applications Table */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Pending Staff Applications (Requires Approval)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Review and authorize new dairy kiosk operators and maintenance technicians.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Staff ID</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Phone</th>
                          <th className="py-3 px-4">Assigned Kiosk</th>
                          <th className="py-3 px-4 text-right">Approval Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffList.filter((s) => s.approvalStatus === 'PENDING').length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No pending staff registration requests at this time.
                            </td>
                          </tr>
                        ) : (
                          staffList
                            .filter((s) => s.approvalStatus === 'PENDING')
                            .map((staff) => (
                              <tr key={staff.uid}>
                                <td className="py-3 px-4 font-bold text-slate-900">{staff.fullName}</td>
                                <td className="py-3 px-4 font-mono font-bold text-amber-700">{staff.staffId}</td>
                                <td className="py-3 px-4 text-slate-600">{staff.email}</td>
                                <td className="py-3 px-4 text-slate-600">{staff.phone || 'N/A'}</td>
                                <td className="py-3 px-4 font-mono text-slate-700">{staff.assignedMachineId || machine?.machineId}</td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleStaffAction(staff.uid, 'APPROVE')}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleStaffAction(staff.uid, 'REJECT')}
                                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                    >
                                      <X className="w-3 h-3" />
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Active / Verified Staff Directory */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 text-sm">Active & Verified Dairy Staff Directory</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Staff ID</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Assigned Machine</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Account Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffList
                          .filter((s) => s.approvalStatus !== 'PENDING')
                          .map((staff) => (
                            <tr key={staff.uid}>
                              <td className="py-3 px-4 font-bold text-slate-900">{staff.fullName}</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-800">{staff.staffId}</td>
                              <td className="py-3 px-4 text-slate-600">{staff.email}</td>
                              <td className="py-3 px-4 font-mono text-slate-700">{staff.assignedMachineId || machine?.machineId}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    staff.approvalStatus === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : staff.approvalStatus === 'SUSPENDED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {staff.approvalStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {staff.approvalStatus === 'APPROVED' ? (
                                  <button
                                    onClick={() => handleStaffAction(staff.uid, 'SUSPEND')}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-xs transition cursor-pointer"
                                  >
                                    Suspend
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleStaffAction(staff.uid, 'REACTIVATE')}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs transition cursor-pointer"
                                  >
                                    Reactivate
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* ------------------------------------------------------------- */}
          {/* TAB CONTENT: RAZORPAY PAYMENT & LIVE READINESS MANAGEMENT */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'RAZORPAY' && (
            <div className="space-y-6">
              {/* Razorpay Integration Hub Overview */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl p-6 border border-emerald-500/30 shadow-lg space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-black tracking-tight">Razorpay Payment & Live Readiness Hub</h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isDemoMode
                              ? 'bg-amber-400 text-slate-950'
                              : isLiveGateway
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-blue-400 text-slate-950'
                          }`}
                        >
                          {envBadgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Cryptographic HMAC-SHA256 verification, Razorpay Server Capture API, webhook ingest, and ESP32 dispensing authorization.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-mono">
                    <span className="text-slate-400">Webhook:</span>
                    <span className="text-emerald-400 truncate max-w-xs">{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/razorpay</span>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/razorpay`);
                          addToast('success', 'URL Copied', 'Razorpay webhook endpoint copied to clipboard.');
                        }
                      }}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition cursor-pointer"
                      title="Copy Webhook URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Dynamic UPI ID</div>
                    <div className="font-mono text-emerald-400 font-bold mt-0.5 text-xs truncate">
                      {stats?.merchantUpiId || config.merchantUpiId || '9353944629@ibl'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Key Configuration</div>
                    <div className="font-mono text-amber-300 font-bold mt-0.5 text-xs truncate">
                      {isDemoMode
                        ? 'LIVE DISABLED (DEMO_MODE=true)'
                        : stats?.isRazorpayConfigured
                        ? `${stats.razorpayMode} (Configured)`
                        : 'Not Set (Demo Safe Mode)'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Webhook Events</div>
                    <div className="text-slate-200 font-bold mt-0.5 text-xs">payment.captured, authorized, failed</div>
                  </div>
                  <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Signature Crypto</div>
                    <div className="text-slate-200 font-bold mt-0.5 text-xs font-mono">Timing-Safe HMAC-SHA256</div>
                  </div>
                  <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">ESP32 Interlock</div>
                    <div className="text-emerald-400 font-bold mt-0.5 text-xs">Confirmation Required</div>
                  </div>
                </div>
              </div>

              {/* Live Mode Deployment Readiness Checklist */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Razorpay Live Mode Readiness Checklist
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Secrets are read strictly from backend environment variables and are never exposed to the browser.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      stats?.liveModeReady
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {stats?.liveModeReady ? 'READY FOR LIVE TRAFFIC' : 'STAGING / DEMO LOCK ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {[
                    {
                      label: 'RAZORPAY_KEY_ID (rzp_live_*)',
                      ok: Boolean(readiness.keyIdConfigured && readiness.isLiveKey),
                      hint: readiness.keyIdConfigured
                        ? readiness.isLiveKey
                          ? 'Live Key ID detected in backend env'
                          : 'Test Key ID configured (use rzp_live_* for Live)'
                        : 'Missing in backend environment',
                    },
                    {
                      label: 'RAZORPAY_KEY_SECRET',
                      ok: Boolean(readiness.keySecretConfigured),
                      hint: readiness.keySecretConfigured
                        ? 'Configured securely on backend'
                        : 'Missing in backend environment',
                    },
                    {
                      label: 'RAZORPAY_WEBHOOK_SECRET',
                      ok: Boolean(readiness.webhookSecretConfigured),
                      hint: readiness.webhookSecretConfigured
                        ? 'Webhook HMAC secret active'
                        : 'Configure webhook & add secret to env',
                    },
                    {
                      label: 'HTTPS APP_BASE_URL',
                      ok: Boolean(readiness.httpsBaseUrl),
                      hint: stats?.appBaseUrl || 'Requires public https:// URL for webhooks',
                    },
                    {
                      label: 'Custom DEVICE_AUTH_SECRET',
                      ok: Boolean(readiness.customDeviceSecretConfigured),
                      hint: readiness.customDeviceSecretConfigured
                        ? 'Custom ESP32 hardware secret active'
                        : 'Using default secret (rotate before live)',
                    },
                    {
                      label: 'DEMO_MODE Safety Lock',
                      ok: Boolean(readiness.demoModeDisabled),
                      hint: readiness.demoModeDisabled
                        ? 'DEMO_MODE=false (Live charges enabled)'
                        : 'DEMO_MODE=true (Live charges blocked safely)',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        item.ok ? 'bg-white border-emerald-200' : 'bg-white border-amber-200'
                      }`}
                    >
                      {item.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{item.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{item.hint}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Free-Tier vs Paid Backend Architecture Notice */}
              <div className="bg-blue-50/70 rounded-2xl p-5 border border-blue-200 space-y-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-black text-blue-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    AI Studio Starter Tier (No Cloud Billing) Architecture
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Project: {stats?.firebaseProjectId || config.firebaseProjectId || 'khaki-bond-02ts5'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 space-y-1">
                    <div className="font-bold text-emerald-800">Active on Free Tier (Zero Billing)</div>
                    <p className="text-slate-600">
                      Firebase Client Auth (Google Sign-In), Client-side Firestore SDK with hardened security rules, DEMO_MODE=true payment simulation, PDF receipts, FEFO inventory, and local water-based ESP32 testing.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-800">Requires User-Owned Cloud Project / Billing</div>
                    <p className="text-slate-600">
                      Server-side Firebase Admin SDK IAM operations, unauthenticated public Cloud Run URL for live Razorpay webhooks, and live monetary settlement (when DEMO_MODE=false).
                    </p>
                  </div>
                </div>
              </div>

              {/* Metric Cards: Total Orders, Simulated Demo Paid, Real Gateway Captured, Failed, Pending */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Total Orders</span>
                    <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-600">{envBadgeLabel}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats?.totalTestOrders ?? orders.length}</div>
                  <p className="text-[10px] text-slate-400">All checkout attempts</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-1">
                  <div className="text-[11px] font-bold text-amber-800 uppercase flex items-center justify-between">
                    <span>Simulated Paid</span>
                    <span className="font-mono text-[9px] bg-amber-100 px-1.5 py-0.5 rounded font-black text-amber-800">DEMO SIM</span>
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    {stats?.simulatedPaidOrders ??
                      orders.filter(
                        (o) =>
                          o.paymentStatus === 'PAID' &&
                          (o.isSimulatedPayment === true ||
                            o.gatewayMode === 'DEMO_SIMULATION' ||
                            o.razorpayPaymentId?.startsWith('pay_sim_') ||
                            o.razorpayPaymentId?.startsWith('pay_Demo'))
                      ).length}
                  </div>
                  <p className="text-[10px] text-amber-700">Non-monetary test records</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center justify-between">
                    <span>Gateway Captured</span>
                    <span className="font-mono text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded font-black text-emerald-800">RAZORPAY</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    {stats?.gatewayCapturedOrders ??
                      orders.filter((o) => o.paymentStatus === 'PAID' && o.isSimulatedPayment === false).length}
                  </div>
                  <p className="text-[10px] text-emerald-700">Cryptographically verified</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-1">
                  <div className="text-[11px] font-bold text-rose-800 uppercase flex items-center justify-between">
                    <span>Failed Payments</span>
                    <span className="font-mono text-[9px] bg-rose-100 px-1.5 py-0.5 rounded font-black text-rose-800">BLOCKED</span>
                  </div>
                  <div className="text-2xl font-black text-rose-600">
                    {stats?.failedPayments ?? orders.filter((o) => o.paymentStatus === 'FAILED').length}
                  </div>
                  <p className="text-[10px] text-rose-600">Declined or signature mismatch</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                    <span>Pending Capture</span>
                    <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-700">UNPAID</span>
                  </div>
                  <div className="text-2xl font-black text-slate-700">
                    {stats?.pendingPayments ?? orders.filter((o) => o.paymentStatus === 'PENDING').length}
                  </div>
                  <p className="text-[10px] text-slate-500">Awaiting final capture</p>
                </div>
              </div>

              {/* Filter Buttons & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
                  {(['ALL', 'PAID', 'FAILED', 'PENDING'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRazorpayFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        razorpayFilter === filter ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {filter === 'ALL' ? 'All Payments' : filter === 'PAID' ? 'Captured (Paid)' : filter}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Order, Payment ID, Customer..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Razorpay Test Orders Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">UPI ID</th>
                        <th className="py-3 px-4">Payment Ref</th>
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Payment Type</th>
                        <th className="py-3 px-4">Transaction Status</th>
                        <th className="py-3 px-4">Dispensing Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {razorpayFilteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-10 text-center text-slate-400">
                            No transactions matching selected filter.
                          </td>
                        </tr>
                      ) : (
                        razorpayFilteredOrders.map((ord) => {
                          const isDemoSim =
                            ord.isSimulatedPayment === true ||
                            ord.gatewayMode === 'DEMO_SIMULATION' ||
                            ord.razorpayPaymentId?.startsWith('pay_sim_') ||
                            ord.razorpayPaymentId?.startsWith('pay_Demo') ||
                            ord.razorpayOrderId?.startsWith('order_sim_') ||
                            ord.razorpayOrderId?.startsWith('order_Demo');

                          return (
                          <tr key={ord.orderId} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {new Date(ord.createdAt).toLocaleString()}
                            </td>

                            <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {ord.orderId}
                            </td>

                            <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-[11px] whitespace-nowrap">
                              {ord.upiId || stats?.merchantUpiId || config.merchantUpiId || '9353944629@ibl'}
                            </td>

                            <td className="py-3 px-4 font-mono text-slate-700 text-[11px]">
                              <span className="truncate max-w-[130px] block" title={ord.razorpayPaymentId || ord.razorpayOrderId || 'N/A'}>
                                {ord.razorpayPaymentId || ord.razorpayOrderId || 'Pending Intent'}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{ord.customerName}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{ord.customerEmail}</div>
                            </td>

                            <td className="py-3 px-4 font-extrabold text-emerald-700 whitespace-nowrap">
                              {ord.quantityMl === 1000 ? '1 Litre (1000 ml)' : `${ord.quantityMl} ml`}
                            </td>

                            <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                              ₹{ord.amountInr}.00
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              {isDemoSim ? (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-[10px] font-mono font-black text-amber-900">
                                  DEMO SIMULATION
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-[10px] font-mono font-black text-emerald-900">
                                  VERIFIED GATEWAY
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  ord.paymentStatus === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.paymentStatus === 'FAILED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ord.paymentStatus}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  ord.dispensingStatus === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.dispensingStatus === 'DISPENSING'
                                    ? 'bg-blue-100 text-blue-800 animate-pulse'
                                    : ord.dispensingStatus === 'PENDING_DISPENSE'
                                    ? 'bg-purple-100 text-purple-800'
                                    : ord.dispensingStatus === 'FAILED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {ord.dispensingStatus}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    try {
                                      downloadReceiptPdf(ord);
                                      addToast('success', 'PDF Downloaded', `Receipt for ${ord.orderId} saved.`);
                                    } catch (err: any) {
                                      addToast('error', 'Download Error', err.message);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                  title="Download Official PDF Invoice"
                                >
                                  <Download className="w-3 h-3" />
                                  Receipt
                                </button>
                                <button
                                  onClick={() => navigateTo('dispensing-status', { orderId: ord.orderId })}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                                  title="View Dispensing Telemetry"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB CONTENT: ORDER MANAGEMENT TABS (ALL, COMPLETED, DISPENSING, PENDING, FAILED) */}
          {/* ------------------------------------------------------------- */}
          {activeTab !== 'LOCATION' && activeTab !== 'INVENTORY' && activeTab !== 'STAFF' && activeTab !== 'RAZORPAY' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search orders in this tab..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-emerald-500"
                  />
                </div>

                <div className="text-xs text-slate-500">
                  Showing <strong>{filteredOrders.length}</strong> orders in <span className="font-bold text-slate-900">{activeTab.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Orders Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                {ordersLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading orders...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No orders found in <span className="font-bold text-slate-700">{activeTab.replace('_', ' ')}</span>.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">UPI ID</th>
                          <th className="py-3 px-4">Quantity</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Payment Type</th>
                          <th className="py-3 px-4">Transaction Status</th>
                          <th className="py-3 px-4">Dispensing</th>
                          <th className="py-3 px-4">Created</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.map((order) => {
                          const isDemoSim =
                            order.isSimulatedPayment === true ||
                            order.gatewayMode === 'DEMO_SIMULATION' ||
                            order.razorpayPaymentId?.startsWith('pay_sim_') ||
                            order.razorpayPaymentId?.startsWith('pay_Demo') ||
                            order.razorpayOrderId?.startsWith('order_sim_') ||
                            order.razorpayOrderId?.startsWith('order_Demo');

                          return (
                          <tr key={order.orderId} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {order.orderId}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {order.customerName === 'Valued Customer' || order.customerId === 'guest-user' || order.customerId.startsWith('cust_seed') ? (
                                  <>
                                    <span className="font-semibold text-slate-800">
                                      {order.customerName === 'Valued Customer' ? 'Guest Customer' : order.customerName}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-600 font-bold border border-slate-200">
                                      {order.customerId.startsWith('cust_seed') ? 'DEMO' : 'GUEST'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-slate-900">{order.customerName}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                                      REGISTERED
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{order.customerEmail}</div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] font-bold text-emerald-700 whitespace-nowrap">
                              {order.upiId || stats?.merchantUpiId || config.merchantUpiId || '9353944629@ibl'}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {order.quantityMl === 1000 ? '1 Litre (1000 ml)' : `${order.quantityMl} ml`}
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-700 whitespace-nowrap">
                              ₹{order.amountInr}.00
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isDemoSim ? (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-[10px] font-mono font-black text-amber-900">
                                  DEMO SIMULATION
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-[10px] font-mono font-black text-emerald-900">
                                  VERIFIED GATEWAY
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.paymentStatus === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                order.dispensingStatus === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.dispensingStatus === 'DISPENSING'
                                  ? 'bg-blue-100 text-blue-800 animate-pulse'
                                  : order.dispensingStatus === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {order.dispensingStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-500">
                              {new Date(order.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    try {
                                      downloadReceiptPdf(order);
                                      addToast('success', 'PDF Downloaded', `Receipt for ${order.orderId} saved.`);
                                    } catch (err: any) {
                                      addToast('error', 'Download Error', err.message);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                  title="Download Official PDF Receipt"
                                >
                                  <Download className="w-3 h-3" />
                                  PDF
                                </button>
                                <button
                                  onClick={() => navigateTo('dispensing-status', { orderId: order.orderId })}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pricing & Calibration Configuration Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Quantity Pricing & ESP32 Hardware Calibration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All pricing changes are server-authoritative. The frontend never determines the transaction amount.
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-2xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              {isSavingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {/* Pricing Tiers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-2.5">Quantity (ml)</th>
                  <th className="py-2.5">Display Label</th>
                  <th className="py-2.5">Price (₹ INR)</th>
                  <th className="py-2.5">Pump Run-Time (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {editableTiers.map((tier, index) => (
                  <tr key={tier.id}>
                    <td className="py-3 font-mono font-bold text-slate-900">{tier.quantityMl} ml</td>
                    <td className="py-3">
                      <input
                        type="text"
                        value={tier.label}
                        onChange={(e) => {
                          const updated = [...editableTiers];
                          updated[index].label = e.target.value;
                          setEditableTiers(updated);
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs w-48"
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <span>₹</span>
                        <input
                          type="number"
                          value={tier.priceInr}
                          onChange={(e) => {
                            const updated = [...editableTiers];
                            updated[index].priceInr = Number(e.target.value);
                            setEditableTiers(updated);
                          }}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs w-20 font-bold"
                        />
                      </div>
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      <input
                        type="number"
                        value={tier.defaultRunTimeMs}
                        onChange={(e) => {
                          const updated = [...editableTiers];
                          updated[index].defaultRunTimeMs = Number(e.target.value);
                          setEditableTiers(updated);
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs w-24"
                      /> ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hardware Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Pulses per ml (Flow Sensor):</label>
              <input
                type="number"
                step="0.1"
                value={pulsesPerMl}
                onChange={(e) => setPulsesPerMl(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
              <span className="text-[10px] text-slate-400">YF-S201 standard: 4.5 pulses/ml</span>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Max Safety Cutoff Timeout:</label>
              <input
                type="number"
                step="1000"
                value={maxRuntimeMs}
                onChange={(e) => setMaxRuntimeMs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
              <span className="text-[10px] text-slate-400">Hardware cutoff in milliseconds</span>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Relay Polarity:</label>
              <select
                value={relayActiveLow ? 'true' : 'false'}
                onChange={(e) => setRelayActiveLow(e.target.value === 'true')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="true">Active LOW (Relay energized on LOW)</option>
                <option value="false">Active HIGH (Relay energized on HIGH)</option>
              </select>
              <span className="text-[10px] text-slate-400">GPIO 26 pump relay module setting</span>
            </div>
          </div>
        </div>

        {/* Audit Trail & Event Logs */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              Cryptographic Audit Log & Hardware Events
            </h3>
            <span className="text-[11px] text-slate-400">Immutable ledger</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {stats?.auditLogs?.map((log: any) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                    {log.event}
                  </span>
                  <span className="font-mono text-slate-600 text-[11px]">
                    {JSON.stringify(log.details)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
