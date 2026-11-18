import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemConfig, MilkTier, MachineInfo, Order } from '../types';
import { testConnection } from '../lib/firebase';
import { upsertOrderInFirestore } from '../services/firestoreService';

export type PageName =
  | 'home'
  | 'buy-milk'
  | 'payment'
  | 'payment-status'
  | 'dispensing-status'
  | 'order-history'
  | 'admin-dashboard'
  | 'staff-dashboard'
  | 'staff-register'
  | 'customer-dashboard'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'about-us'
  | 'contact-us'
  | 'privacy-policy'
  | 'terms'
  | 'refund-policy'
  | 'shipping-policy'
  | 'milk-pricing'
  | 'faq'
  | 'hardware-hub';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  currentPage: PageName;
  pageParams: Record<string, any>;
  navigateTo: (page: PageName, params?: Record<string, any>) => void;
  config: SystemConfig;
  priceTiers: MilkTier[];
  machine: MachineInfo | null;
  currentOrder: Order | null;
  setCurrentOrder: (order: Order | null) => void;
  activeOrderId: string | null;
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  removeToast: (id: string) => void;
  refreshMachine: () => Promise<void>;
  createOrder: (quantityMl: number) => Promise<Order | null>;
  emergencyStop: () => Promise<boolean>;
  resetEmergency: () => Promise<boolean>;
}

const defaultConfig: SystemConfig = {
  appName: 'SMART MILK ATM',
  tagline: 'Smart Milk ATM — Fresh Milk, Smart Payment, Zero Plastic Pouches',
  environmentalMessage: 'Say No to Plastic Milk Pouches — Bring Your Own Container.',
  demoMode: true,
  razorpayKeyId: null,
  razorpayConfigured: false,
  razorpayMode: 'UNCONFIGURED',
  webhookConfigured: false,
  liveModeReady: false,
  defaultMachineId: 'ATM-KA-001',
  currency: 'INR',
  serverTime: new Date().toISOString(),
};

const defaultTiers: MilkTier[] = [
  { id: 'tier-250', quantityMl: 250, label: '250 ml (Single Cup)', priceInr: 15, pricePaise: 1500, defaultRunTimeMs: 5000, estimatedPulses: 1125 },
  { id: 'tier-500', quantityMl: 500, label: '500 ml (Half Litre)', priceInr: 30, pricePaise: 3000, defaultRunTimeMs: 10000, estimatedPulses: 2250 },
  { id: 'tier-750', quantityMl: 750, label: '750 ml (Family Pack)', priceInr: 45, pricePaise: 4500, defaultRunTimeMs: 15000, estimatedPulses: 3375 },
  { id: 'tier-1000', quantityMl: 1000, label: '1000 ml (1 Litre Full Bottle)', priceInr: 60, pricePaise: 6000, defaultRunTimeMs: 20000, estimatedPulses: 4500 },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageName>('home');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [priceTiers, setPriceTiers] = useState<MilkTier[]>(defaultTiers);
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigateTo = (page: PageName, params?: Record<string, any>) => {
    setCurrentPage(page);
    setPageParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch initial configuration & pricing
  const fetchConfigAndPricing = async () => {
    try {
      const [cfgRes, priceRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/pricing'),
      ]);
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData);
      }
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        if (priceData.tiers) setPriceTiers(priceData.tiers);
      }
    } catch {
      // Offline fallback
    }
  };

  // Refresh machine status
  const refreshMachine = useCallback(async () => {
    try {
      const res = await fetch(`/api/devices/${config.defaultMachineId}/status`);
      if (res.ok) {
        const data = await res.json();
        setMachine(data.machine);
      }
    } catch {
      // fallback
    }
  }, [config.defaultMachineId]);

  useEffect(() => {
    testConnection();
    fetchConfigAndPricing();
    refreshMachine();
    const interval = setInterval(refreshMachine, 4000);
    return () => clearInterval(interval);
  }, [refreshMachine]);

  // Create Order
  const createOrder = async (quantityMl: number): Promise<Order | null> => {
    try {
      const token = localStorage.getItem('smart_milk_atm_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          quantityMl,
          machineId: config.defaultMachineId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        addToast('error', 'Order Creation Failed', err.error || 'Server rejected order request');
        return null;
      }

      const data = await res.json();
      setCurrentOrder(data.order);
      setActiveOrderId(data.order.orderId);
      // Mirror order to Firestore when user has an active verified Firebase session
      void upsertOrderInFirestore(data.order);
      addToast('success', 'Order Initiated', `Selected ${quantityMl} ml. Ready for payment.`);
      return data.order;
    } catch (e: any) {
      addToast('error', 'Network Error', e.message || 'Could not connect to milk ATM backend');
      return null;
    }
  };

  // Emergency Stop Trigger
  const emergencyStop = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('smart_milk_atm_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/emergency-stop', { method: 'POST', headers });
      if (res.ok) {
        addToast('warning', 'EMERGENCY STOP ACTIVATED', 'Milk pump cut off and safety interlock engaged.');
        await refreshMachine();
        return true;
      }
      const err = await res.json().catch(() => ({}));
      addToast('error', 'Emergency Stop Failed', err.error || 'Authentication required');
      return false;
    } catch {
      return false;
    }
  };

  const resetEmergency = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('smart_milk_atm_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/reset-emergency', { method: 'POST', headers });
      if (res.ok) {
        addToast('success', 'System Reset', 'Safety interlock cleared. Machine is READY.');
        await refreshMachine();
        return true;
      }
      const err = await res.json().catch(() => ({}));
      addToast('error', 'Reset Failed', err.error || 'Admin or staff privileges required');
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        pageParams,
        navigateTo,
        config,
        priceTiers,
        machine,
        currentOrder,
        setCurrentOrder,
        activeOrderId,
        toasts,
        addToast,
        removeToast,
        refreshMachine,
        createOrder,
        emergencyStop,
        resetEmergency,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
