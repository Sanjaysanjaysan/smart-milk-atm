import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  User,
  Recycle,
  Droplets,
  Calendar,
  Receipt,
  Download,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { Order } from '../types';
import { downloadReceiptPdf } from '../utils/receiptGenerator';

export const CustomerDashboardPage: React.FC = () => {
  const { user, getAuthHeader } = useAuth();
  const { navigateTo, addToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserOrders = async () => {
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

    fetchUserOrders();
  }, [user]);

  const completedOrders = orders.filter((o) => o.dispensingStatus === 'COMPLETED');
  const totalPurchasedMl = completedOrders.reduce((sum, o) => sum + o.quantityMl, 0);
  const pouchesSaved = Math.round(totalPurchasedMl / 500) || (user?.bottlesSaved ?? 0);

  const handleDownloadReceipt = (order: Order) => {
    try {
      downloadReceiptPdf(order);
      addToast('success', 'PDF Downloaded', `Receipt for order ${order.orderId} saved.`);
    } catch (err: any) {
      addToast('error', 'Download Error', err.message || 'Could not generate PDF receipt.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'CU'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">{user?.fullName || 'Registered Customer'}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  Verified Customer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'customer@smartmilkatm.in'}</p>
              {user?.createdAt && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('order-history')}
              className="px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-slate-500" />
              Order History
            </button>

            <button
              onClick={() => navigateTo('buy-milk')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl shadow-md text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Droplets className="w-4 h-4 fill-current" />
              Dispense Milk
            </button>
          </div>
        </div>

        {/* Environmental & Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Orders */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-slate-900">{orders.length}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</div>
            <p className="text-[11px] text-slate-400">
              {completedOrders.length} completed dispensings
            </p>
          </div>

          {/* Card 2: Completed Orders */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-emerald-700">{completedOrders.length}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Orders</div>
            <p className="text-[11px] text-slate-400">
              Verified & collected at ATM-KA-001
            </p>
          </div>

          {/* Card 3: Total Milk Collected */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalPurchasedMl} ml</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Milk Collected</div>
            <p className="text-[11px] text-slate-400">
              Chilled 100% farm-fresh cow milk
            </p>
          </div>

          {/* Card 4: Plastic Pouches Prevented */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 border border-emerald-500/30 shadow-lg space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Recycle className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-emerald-300">{pouchesSaved}</div>
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">Plastic Pouches Saved</div>
            <p className="text-[11px] text-slate-300">
              By bringing reusable containers (BYOC)
            </p>
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Your Recent Milk Purchases</h3>
            <button
              onClick={() => navigateTo('order-history')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              View All Orders
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading order records...</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-3">
              <p>No orders yet. Place your first milk purchase to start saving plastic pouches!</p>
              <button
                onClick={() => navigateTo('buy-milk')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
              >
                Buy Milk Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.orderId}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{order.orderId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.dispensingStatus === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.dispensingStatus === 'DISPENSING'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.dispensingStatus}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {new Date(order.createdAt).toLocaleString()} • Kiosk #{order.machineId}
                    </p>
                    {order.razorpayPaymentId && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        Payment Ref: <span className="text-slate-600 font-bold">{order.razorpayPaymentId}</span>{' '}
                        {order.razorpayPaymentId.startsWith('pay_sim_') ||
                        order.razorpayPaymentId.startsWith('pay_Demo') ||
                        order.razorpayPaymentId.startsWith('pay_test_')
                          ? '(Demo/Test Mode)'
                          : '(Razorpay Verified)'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-black text-slate-900 text-sm">{order.quantityMl} ml</div>
                      <div className="text-emerald-700 font-bold">₹{order.amountInr}.00</div>
                    </div>

                    <button
                      onClick={() => handleDownloadReceipt(order)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Download PDF Receipt"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Receipt
                    </button>

                    <button
                      onClick={() => navigateTo('dispensing-status', { orderId: order.orderId })}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 text-xs transition cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
