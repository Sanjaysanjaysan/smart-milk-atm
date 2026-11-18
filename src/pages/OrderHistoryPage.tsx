import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Download,
  Printer,
  X,
  Droplets,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Order } from '../types';
import { downloadReceiptPdf, printReceiptPdf } from '../utils/receiptGenerator';

export const OrderHistoryPage: React.FC = () => {
  const { navigateTo, addToast } = useApp();
  const { user, getAuthHeader } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleDownloadReceipt = (order: Order) => {
    if (user && user.role !== 'admin' && order.customerId !== user.uid && order.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
      addToast('error', 'Unauthorized', 'You can only download receipts for your own orders.');
      return;
    }
    try {
      downloadReceiptPdf(order);
      addToast('success', 'PDF Downloaded', `Receipt for order ${order.orderId} downloaded successfully.`);
    } catch (err: any) {
      addToast('error', 'Download Error', err.message || 'Could not generate PDF');
    }
  };

  const handlePrintReceipt = (order: Order) => {
    if (user && user.role !== 'admin' && order.customerId !== user.uid && order.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
      addToast('error', 'Unauthorized', 'You can only print receipts for your own orders.');
      return;
    }
    try {
      printReceiptPdf(order);
    } catch (err: any) {
      addToast('error', 'Print Error', err.message || 'Could not print receipt');
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.machineId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      order.dispensingStatus === statusFilter ||
      order.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Audit Trail & Receipts
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              Milk Dispensing History
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Complete verifiable ledger of all UPI payments and automated dispensing cycles.
            </p>
          </div>

          <button
            onClick={() => navigateTo('buy-milk')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-sm text-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Droplets className="w-3.5 h-3.5 fill-current" />
            New Milk Purchase
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID, Kiosk, or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs font-semibold">
            {['ALL', 'COMPLETED', 'DISPENSING', 'PENDING_DISPENSE', 'FAILED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {status === 'ALL' ? 'All Orders' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading order records...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No orders matched your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                    <th className="py-4 px-6">Order ID & Date</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Quantity</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Payment</th>
                    <th className="py-4 px-6">Dispensing</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <div className="font-mono font-bold text-slate-900">{order.orderId}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400">{order.customerEmail}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-black text-slate-900">{order.quantityMl} ml</span>
                        <div className="text-[10px] text-slate-400">Pure Cow Milk</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-bold text-emerald-700">₹{order.amountInr}.00</span>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          order.paymentStatus === 'PAID'
                            ? order.isSimulatedPayment || order.gatewayMode === 'DEMO_SIMULATION' || (order.razorpayPaymentId || '').startsWith('pay_sim_') || (order.razorpayPaymentId || '').startsWith('pay_Demo')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                            : order.paymentStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus === 'PAID' && (order.isSimulatedPayment || order.gatewayMode === 'DEMO_SIMULATION' || (order.razorpayPaymentId || '').startsWith('pay_sim_') || (order.razorpayPaymentId || '').startsWith('pay_Demo'))
                            ? 'PAID (DEMO SIM)'
                            : order.paymentStatus}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
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

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadReceipt(order)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] flex items-center gap-1 transition"
                            title="Download PDF Receipt"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </button>

                          <button
                            onClick={() => setSelectedInvoiceOrder(order)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition"
                            title="View Invoice"
                          >
                            <Receipt className="w-3.5 h-3.5 text-slate-500" />
                            Invoice
                          </button>

                          <button
                            onClick={() => navigateTo('buy-milk', { preselectTier: order.quantityMl })}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition"
                            title="Reorder same quantity"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reorder
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Digital Tax Invoice Modal */}
        {selectedInvoiceOrder && (() => {
          const isDemoOrder =
            selectedInvoiceOrder.isSimulatedPayment === true ||
            selectedInvoiceOrder.gatewayMode === 'DEMO_SIMULATION' ||
            (selectedInvoiceOrder.razorpayPaymentId || '').startsWith('pay_sim_') ||
            (selectedInvoiceOrder.razorpayPaymentId || '').startsWith('pay_Demo') ||
            selectedInvoiceOrder.orderId.startsWith('order_sim_') ||
            selectedInvoiceOrder.orderId.startsWith('order_Demo');

          return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative">
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Invoice Header */}
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      {isDemoOrder ? 'DEMO RECEIPT / SIMULATED INVOICE' : 'TAX INVOICE / RECEIPT'}
                    </h2>
                    <p className="text-[11px] text-slate-500">Smart Milk ATM Vending Operations</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-900">{selectedInvoiceOrder.orderId}</span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(selectedInvoiceOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Kiosk & Customer Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Kiosk Location</span>
                  <p className="font-bold text-slate-800">Kiosk #{selectedInvoiceOrder.machineId}</p>
                  <p className="text-slate-500 text-[11px]">80 Feet Rd, Koramangala, Bengaluru</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Billed Customer</span>
                  <p className="font-bold text-slate-800">{selectedInvoiceOrder.customerName}</p>
                  <p className="text-slate-500 text-[11px]">{selectedInvoiceOrder.customerEmail}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <span>Item Description</span>
                  <span>Qty / Rate</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between py-1.5 font-semibold text-slate-800">
                  <div>
                    <p>Pasteurized Cow Milk (4.5% Fat)</p>
                    <p className="text-[10px] text-slate-400">Dispensed via automated SS304 nozzle</p>
                  </div>
                  <div className="text-right">
                    {selectedInvoiceOrder.quantityMl} ml
                  </div>
                  <div className="font-bold text-slate-900">
                    ₹{selectedInvoiceOrder.amountInr}.00
                  </div>
                </div>
                <div className="flex justify-between py-1 text-slate-500 text-[11px]">
                  <span>Single-use Plastic Pouch Charge</span>
                  <span>Waived (BYOC)</span>
                  <span>₹0.00</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                  <span>{isDemoOrder ? 'Simulated Total (Demo):' : 'Grand Total Paid:'}</span>
                  <span className="text-emerald-700">₹{selectedInvoiceOrder.amountInr}.00</span>
                </div>
              </div>

              {/* Cryptographic Payment & Dispensing Stamp */}
              <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                isDemoOrder
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`flex justify-between font-bold ${isDemoOrder ? 'text-amber-950' : 'text-emerald-950'}`}>
                  <span>Payment Gateway:</span>
                  <span>
                    {isDemoOrder
                      ? `Simulated UPI (Demo Mode — No Real Charge) (${selectedInvoiceOrder.razorpayPaymentId || 'pay_sim_demo'})`
                      : `Razorpay Verified (${selectedInvoiceOrder.razorpayPaymentId || 'pay_verified'})`}
                  </span>
                </div>
                <div className={`flex justify-between font-mono text-[10px] ${isDemoOrder ? 'text-amber-900' : 'text-emerald-900'}`}>
                  <span>Dispense Token:</span>
                  <span className="truncate max-w-[200px]">{selectedInvoiceOrder.dispensingToken || 'DSP-AUTH-VERIFIED'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleDownloadReceipt(selectedInvoiceOrder)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Receipt (PDF)
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedInvoiceOrder)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setSelectedInvoiceOrder(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
};
