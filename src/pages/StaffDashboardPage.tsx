import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { saveRefillBatchToFirestore, isFirebaseSessionReady } from '../services/firestoreService';
import {
  Wrench,
  Droplets,
  Thermometer,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlusCircle,
  RotateCcw,
  ShieldAlert,
  FileText,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  Send,
  Radio,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MilkBatch, StockRefill, StockTransaction, Order } from '../types';

export const StaffDashboardPage: React.FC = () => {
  const { user, isStaff, isAdmin, getAuthHeader } = useAuth();
  const { machine, config, refreshMachine, addToast } = useApp();

  const [batches, setBatches] = useState<MilkBatch[]>([]);
  const [refills, setRefills] = useState<StockRefill[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Refill Form State
  const [supplierName, setSupplierName] = useState('Karnataka Milk Federation (Nandini Dairy)');
  const [quantityLitres, setQuantityLitres] = useState<number>(50);
  const [batchNumber, setBatchNumber] = useState(`BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [tempCelsius, setTempCelsius] = useState<string>('3.8');
  const [refillNotes, setRefillNotes] = useState('Chilled milk tanker intake. Cold chain inspected.');
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);

  // Technical Problem Report Modal
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemType, setProblemType] = useState('PUMP_FLOW_CALIBRATION');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemSeverity, setProblemSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);

  const fetchInventoryData = async () => {
    try {
      const [invRes, ordRes] = await Promise.all([
        fetch('/api/inventory/summary', { headers: getAuthHeader() }),
        fetch('/api/orders', { headers: getAuthHeader() }),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setBatches(invData.batches || []);
        setRefills(invData.refills || []);
      }

      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders || []);
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
    const interval = setInterval(() => {
      fetchInventoryData();
      refreshMachine();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantityLitres <= 0) {
      addToast('error', 'Invalid Quantity', 'Please enter a positive amount in Litres');
      return;
    }

    setIsSubmittingRefill(true);
    try {
      const res = await fetch('/api/inventory/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          supplierName,
          quantityLitres: Number(quantityLitres),
          batchNumber,
          expiryDate,
          temperatureCelsius: tempCelsius ? Number(tempCelsius) : null,
          notes: refillNotes,
        }),
      });

      const data = await res.json();
      setIsSubmittingRefill(false);

      if (res.ok && data.success) {
        if (isFirebaseSessionReady() && data.batch && data.refill) {
          void saveRefillBatchToFirestore({
            batch: data.batch,
            refill: data.refill,
            staffId: user?.staffId || (isAdmin ? 'ADM-OFFICER' : 'STF-STAFF'),
            staffName: user?.fullName || 'Staff Operator',
            newStockLiters: Number(data.currentStockLiters ?? 0),
          });
        }
        addToast('success', 'Milk Stock Refilled', `Added ${quantityLitres} L to kiosk inventory.`);
        setBatchNumber(`BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`);
        await fetchInventoryData();
        await refreshMachine();
      } else {
        addToast('error', 'Refill Failed', data.error || 'Server rejected refill entry.');
      }
    } catch (e: any) {
      setIsSubmittingRefill(false);
      addToast('error', 'Network Error', e.message || 'Could not communicate with server');
    }
  };

  const handleProblemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) return;

    setIsSubmittingProblem(true);
    try {
      const res = await fetch('/api/staff/report-problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          problemType,
          description: problemDescription,
          severity: problemSeverity,
        }),
      });

      setIsSubmittingProblem(false);
      if (res.ok) {
        addToast('warning', 'Problem Dispatched', 'Incident logged in audit system for Administrator review.');
        setShowProblemModal(false);
        setProblemDescription('');
        await refreshMachine();
      } else {
        addToast('error', 'Dispatch Failed', 'Could not record problem.');
      }
    } catch {
      setIsSubmittingProblem(false);
    }
  };

  // Stock calculations
  const currentStock = machine?.currentStockLiters ?? 0;
  const tankCapacity = machine?.tankCapacityLiters ?? 100;
  const stockPercentage = Math.min(100, Math.round((currentStock / tankCapacity) * 100));
  const isLowStock = currentStock <= (machine?.minStockThresholdLiters ?? 5.0);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Staff Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Staff & Technician Operations Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  Staff Access
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Assigned Kiosk: <span className="font-mono font-bold text-slate-800">{user?.assignedMachineId || machine?.machineId}</span> • Certified Technician: <span className="font-bold text-slate-800">{user?.fullName}</span> ({user?.staffId || 'STF-KA-101'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowProblemModal(true)}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Report Issue
            </button>

            <button
              onClick={() => {
                fetchInventoryData();
                refreshMachine();
                addToast('info', 'Refreshed', 'Telemetry and inventory synced.');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Low Stock Warning Banner */}
        {isLowStock && (
          <div className="p-4 bg-red-500 text-white rounded-3xl shadow-md border border-red-600 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-white shrink-0" />
              <div>
                <p className="font-black text-sm tracking-wide uppercase">
                  LOW MILK STOCK – REFILL REQUIRED
                </p>
                <p className="text-xs opacity-90">
                  Current stock has fallen to {currentStock.toFixed(1)} Litres (threshold: {machine?.minStockThresholdLiters ?? 5} L). Customer vending may be paused soon.
                </p>
              </div>
            </div>
            <a
              href="#refill-section"
              className="px-3 py-1.5 bg-white text-red-600 font-bold text-xs rounded-xl shadow-xs shrink-0 hover:bg-red-50"
            >
              Refill Tank Now
            </a>
          </div>
        )}

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Milk Inventory Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Milk Tank Stock</span>
              <Droplets className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{currentStock.toFixed(1)}</span>
              <span className="text-xs font-bold text-slate-500">/ {tankCapacity} Litres</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isLowStock ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${stockPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {isLowStock ? '⚠️ Urgent refill required' : 'Optimal operating level'}
            </p>
          </div>

          {/* Temperature Sensor DS18B20 Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">DS18B20 Temp Sensor</span>
              <Thermometer className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              {machine?.temperatureSensorConnected && machine?.temperatureCelsius !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-600">
                    {machine.temperatureCelsius}°C
                  </span>
                  <span className="text-xs font-bold text-slate-500">Chilled Cold-Chain</span>
                </div>
              ) : (
                <div className="text-base font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg inline-block">
                  SENSOR NOT CONNECTED
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Target range: 2.0°C to 4.0°C (Digital Bus Pin 4)
            </p>
          </div>

          {/* ESP32 Hardware Status */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">ESP32 Controller</span>
              <Cpu className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xl font-black text-slate-900">{machine?.status || 'READY'}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              IP: {machine?.ipAddress || '192.168.1.142'} • Relay: Pin {machine?.relayPin ?? 26}
            </p>
          </div>

          {/* Staff Profile Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Logged-In Staff</span>
              <UserCheck className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Verified ID: {user?.staffId || 'STF-KA-101'}
            </span>
          </div>
        </div>

        {/* Main Grid: Refill Form + FEFO Batches List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Refill Form (Left 5 cols) */}
          <div id="refill-section" className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-600" />
                Record Milk Refill Intake
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Receiving Staff: <span className="font-bold text-slate-800">{user?.fullName} ({user?.staffId || 'STF-KA-101'})</span>
              </p>
            </div>

            <form onSubmit={handleRefillSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Dairy Supplier Name</label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Karnataka Milk Federation (Nandini)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantity (Litres)</label>
                  <input
                    type="number"
                    min="1"
                    max={tankCapacity}
                    step="0.5"
                    required
                    value={quantityLitres}
                    onChange={(e) => setQuantityLitres(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-base"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Intake Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempCelsius}
                    onChange={(e) => setTempCelsius(e.target.value)}
                    placeholder="e.g. 3.8"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Best Before / Expiry</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Receiving Notes & Quality Checks</label>
                <textarea
                  rows={2}
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  placeholder="Pasteurization verified, lactometer check..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  FEFO Automation & Immutable Staff Audit
                </p>
                <p className="text-[10px] leading-relaxed opacity-90">
                  New milk batches are automatically queued into the FEFO engine. Dispensing will deduct from the earliest expiring batch first. Refill logs cannot be deleted by staff.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmittingRefill}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
              >
                {isSubmittingRefill ? 'Recording Refill...' : `Authorize & Add ${quantityLitres} L to Inventory`}
              </button>
            </form>
          </div>

          {/* FEFO Batch Health Viewer (Right 7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Active Milk Batches (FEFO Queue)
                </h2>
                <p className="text-xs text-slate-500">
                  Prioritized by earliest expiry date for zero spoilage
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 px-2.5 py-1 bg-slate-100 rounded-full">
                {batches.filter((b) => b.status === 'ACTIVE' && b.remainingLitres > 0).length} Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-2.5">Batch #</th>
                    <th className="pb-2.5">Supplier</th>
                    <th className="pb-2.5">Remaining / In</th>
                    <th className="pb-2.5">Expiry</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No milk batches recorded. Use the intake form to add stock.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch, idx) => {
                      const isFirstInQueue = idx === 0 && batch.status === 'ACTIVE' && batch.remainingLitres > 0;
                      return (
                        <tr key={batch.batchId} className={isFirstInQueue ? 'bg-emerald-50/50' : ''}>
                          <td className="py-3 font-mono font-bold text-slate-800">
                            {batch.batchNumber}
                            {isFirstInQueue && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white">
                                NEXT FEFO
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-slate-700 max-w-[140px] truncate">
                            {batch.supplierName}
                            <div className="text-[10px] text-slate-400">By: {batch.receivedByStaffName}</div>
                          </td>
                          <td className="py-3 font-bold text-slate-900">
                            <span className="text-emerald-700 font-extrabold">{batch.remainingLitres.toFixed(1)} L</span>
                            <span className="text-slate-400 font-normal text-[10px]"> / {batch.receivedLitres} L</span>
                          </td>
                          <td className="py-3 font-semibold text-slate-700">
                            {batch.expiryDate}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                batch.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : batch.status === 'EXHAUSTED'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {batch.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Recent Refill Log */}
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Recent Machine Refill Audit Logs
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {refills.slice(0, 5).map((r) => (
                  <div key={r.refillId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">
                        +{r.quantityLitres} Litres ({r.batchNumber})
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {r.supplierName} • Received by {r.staffName}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(r.refillTimestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security / Non-Admin Access Notification */}
        <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-slate-800">Role-Based Security Policy Notice</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
              Staff operators cannot modify milk unit prices, configure Razorpay payment gateway credentials, alter admin security parameters, or delete audit histories. All refill submissions and sensor calibration dispatches are cryptographically logged with your Staff ID.
            </p>
          </div>
        </div>
      </div>

      {/* Technical Problem Report Modal */}
      {showProblemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Dispatch Technical Problem Report
              </h3>
              <button
                onClick={() => setShowProblemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProblemSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Issue Category</label>
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="PUMP_FLOW_CALIBRATION">Pump Flow Sensor Calibration Issue</option>
                  <option value="TEMPERATURE_DS18B20">Temperature Sensor / Cooling Compressor Alert</option>
                  <option value="SOLENOID_RELAY">Dispensing Valve / Relay Failure</option>
                  <option value="LEAKAGE_SPILLAGE">Tank Leakage / Milk Spillage Detected</option>
                  <option value="NETWORK_WIFI">ESP32 Wi-Fi / Connectivity Interruption</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Severity Level</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setProblemSeverity(sev)}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition ${
                        problemSeverity === sev
                          ? sev === 'CRITICAL'
                            ? 'bg-red-600 text-white'
                            : sev === 'HIGH'
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Detailed Anomaly Description</label>
                <textarea
                  required
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Describe observed issue, flow pulse count discrepancies, nozzle leaks..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProblemModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProblem}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
                >
                  {isSubmittingProblem ? 'Dispatching...' : 'Submit Incident Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
