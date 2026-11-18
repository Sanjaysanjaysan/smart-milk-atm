import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Application In-Memory / Persistent State
export interface MilkPriceTier {
  id: string;
  quantityMl: number;
  label: string;
  priceInr: number; // in INR
  pricePaise: number; // in Paise for Razorpay
  defaultRunTimeMs: number;
  estimatedPulses: number;
}

export interface OrderRecord {
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  machineId: string;
  quantityMl: number;
  amountPaise: number;
  amountInr: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  upiId?: string;
  upiPaymentUri?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  dispensingStatus: 'WAITING_PAYMENT' | 'PENDING_DISPENSE' | 'DISPENSING' | 'COMPLETED' | 'FAILED';
  dispensingToken?: string;
  dispensedMl?: number;
  failureReason?: string;
  gatewayMode?: 'DEMO_SIMULATION' | 'RAZORPAY_TEST' | 'RAZORPAY_LIVE';
  isSimulatedPayment?: boolean;
  paymentVerificationType?: 'DEMO_SIMULATED' | 'RAZORPAY_TEST_VERIFIED' | 'RAZORPAY_LIVE_VERIFIED' | 'NONE';
  createdAt: string;
  updatedAt: string;
}

export interface DispensingJob {
  jobId: string;
  orderId: string;
  machineId: string;
  quantityMl: number;
  amountInr: number;
  dispensingToken: string;
  targetRunTimeMs: number;
  targetPulses: number;
  status: 'PENDING' | 'CLAIMED' | 'DISPENSING' | 'COMPLETED' | 'FAILED';
  claimedAt?: string;
  completedAt?: string;
  dispensedMl: number;
  pulsesCounted: number;
  failureReason?: string;
}

export interface MachineState {
  machineId: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'READY' | 'DISPENSING' | 'ERROR' | 'EMERGENCY_STOP';
  currentJobId?: string | null;
  tankCapacityLiters: number;
  currentStockLiters: number;
  temperatureCelsius: number | null;
  temperatureSensorConnected: boolean;
  minStockThresholdLiters: number;
  lastHeartbeat: string;
  relayActiveLow: boolean;
  relayPin: number;
  flowSensorPin: number;
  pulsesPerMl: number;
  maxRuntimeMs: number;
  firmwareVersion: string;
  ipAddress: string;
}

// Default Demonstration Pricing (Server Authoritative)
let priceTiers: MilkPriceTier[] = [
  { id: 'tier-250', quantityMl: 250, label: '250 ml (Single Serving)', priceInr: 15, pricePaise: 1500, defaultRunTimeMs: 5000, estimatedPulses: 1125 },
  { id: 'tier-500', quantityMl: 500, label: '500 ml (Half Litre)', priceInr: 30, pricePaise: 3000, defaultRunTimeMs: 10000, estimatedPulses: 2250 },
  { id: 'tier-750', quantityMl: 750, label: '750 ml (Family Pack)', priceInr: 45, pricePaise: 4500, defaultRunTimeMs: 15000, estimatedPulses: 3375 },
  { id: 'tier-1000', quantityMl: 1000, label: '1000 ml (1 Litre Full Bottle)', priceInr: 60, pricePaise: 6000, defaultRunTimeMs: 20000, estimatedPulses: 4500 },
];

// Single machine initial state with genuine Bengaluru Koramangala coordinates
let machine: MachineState = {
  machineId: 'ATM-KA-001',
  name: 'Koramangala Dairy Kiosk #01',
  location: '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
  latitude: 12.9343,
  longitude: 77.6256,
  locationUpdatedAt: new Date().toISOString(),
  status: 'READY',
  currentJobId: null,
  tankCapacityLiters: 100,
  currentStockLiters: 84.5,
  temperatureCelsius: 3.8,
  temperatureSensorConnected: true,
  minStockThresholdLiters: 5.0, // Configurable threshold (default 5.0 L)
  lastHeartbeat: new Date().toISOString(),
  relayActiveLow: true,
  relayPin: 26,
  flowSensorPin: 27,
  pulsesPerMl: 4.5, // 450 pulses per 100ml
  maxRuntimeMs: 25000,
  firmwareVersion: 'v2.4.1-esp32-flow',
  ipAddress: '192.168.1.142',
};

// User Management & Firebase-Compatible Profile Store
export type UserRole = 'customer' | 'staff' | 'admin';

interface UserRecord {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  bottlesSaved: number;
  totalMilkPurchasedMl: number;
  authProvider?: string;
  // Staff fields
  staffId?: string;
  assignedMachineId?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  approvedBy?: string;
  approvedAt?: string;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;
  if (!storedHash.startsWith('scrypt$')) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

const users: Map<string, UserRecord> = new Map();
const userSessions: Map<string, { uid: string; createdAt: number }> = new Map();
const adminInviteTokens: Set<string> = new Set(['INV-ADM-DEMO2026', 'INV-ADM-SMARTATM']);

// Seed initial users for seamless demonstration and testing
const seedCustomer: UserRecord = {
  uid: 'cust-demo-101',
  email: 'sanjay.customer@example.com',
  fullName: 'Sanjay Kumar',
  phone: '+91 98451 12345',
  passwordHash: hashPassword('password123'),
  role: 'customer',
  createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  bottlesSaved: 14,
  totalMilkPurchasedMl: 7000,
  authProvider: 'demo-local',
};
users.set(seedCustomer.uid, seedCustomer);

const seedAdmin: UserRecord = {
  uid: 'adm-001',
  email: 'admin@smartmilkatm.in',
  fullName: 'Chief Dairy Officer (Admin)',
  phone: '+91 98800 99000',
  passwordHash: hashPassword('admin123'),
  role: 'admin',
  createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
  bottlesSaved: 1420,
  totalMilkPurchasedMl: 710000,
  authProvider: 'demo-local',
};
users.set(seedAdmin.uid, seedAdmin);

const seedStaff: UserRecord = {
  uid: 'stf-001',
  email: 'priya.staff@smartmilkatm.in',
  fullName: 'Priya Sharma',
  phone: '+91 98765 43210',
  passwordHash: hashPassword('staff123'),
  role: 'staff',
  staffId: 'STF-KA-101',
  assignedMachineId: 'ATM-KA-001',
  approvalStatus: 'APPROVED',
  approvedBy: 'adm-001',
  approvedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  bottlesSaved: 85,
  totalMilkPurchasedMl: 42500,
  authProvider: 'demo-local',
};
users.set(seedStaff.uid, seedStaff);

// Seed demonstration sessions
userSessions.set('tok-demo-customer', { uid: seedCustomer.uid, createdAt: Date.now() });
userSessions.set('tok-demo-admin', { uid: seedAdmin.uid, createdAt: Date.now() });
userSessions.set('tok-demo-staff', { uid: seedStaff.uid, createdAt: Date.now() });

function sanitizeUser(u: UserRecord) {
  return {
    uid: u.uid,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
    bottlesSaved: u.bottlesSaved,
    totalMilkPurchasedMl: u.totalMilkPurchasedMl,
    authProvider: u.authProvider,
    staffId: u.staffId,
    assignedMachineId: u.assignedMachineId,
    approvalStatus: u.approvalStatus,
    approvedBy: u.approvedBy,
    approvedAt: u.approvedAt,
  };
}

function getAuthenticatedUser(req: express.Request): UserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = userSessions.get(token);
  if (!session) return null;

  return users.get(session.uid) || null;
}

function requireAuth(req: express.Request, res: express.Response): UserRecord | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return null;
  }
  return user;
}

function requireRole(req: express.Request, res: express.Response, allowedRoles: UserRole[]): UserRecord | null {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({ error: `Access denied: Requires ${allowedRoles.join(' or ')} privileges.` });
    return null;
  }
  return user;
}

// -------------------------------------------------------------
// Milk Inventory & FEFO (First Expired, First Out) Batch Models
// -------------------------------------------------------------
export interface MilkBatchRecord {
  batchId: string;
  batchNumber: string;
  machineId: string;
  supplierName: string;
  receivedLitres: number;
  remainingLitres: number;
  expiryDate: string; // YYYY-MM-DD
  storageTemperatureCelsius: number | null;
  receivedAt: string;
  receivedByStaffId: string;
  receivedByStaffName: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'QUARANTINED';
  notes?: string;
}

export interface StockRefillRecord {
  refillId: string;
  machineId: string;
  batchNumber: string;
  supplierName: string;
  quantityLitres: number;
  expiryDate: string;
  temperatureCelsius: number | null;
  staffId: string;
  staffName: string;
  refillTimestamp: string;
  immutable: boolean;
  notes?: string;
}

export interface StockTransactionRecord {
  transactionId: string;
  machineId: string;
  type: 'REFILL' | 'DISPENSE' | 'PARTIAL_DISPENSE' | 'EXPIRED_SPOILED' | 'ADJUSTMENT';
  litres: number;
  batchId?: string;
  batchNumber?: string;
  orderId?: string;
  balanceAfterLitres: number;
  timestamp: string;
  performedBy: string;
  notes?: string;
  unmeasuredEstimate?: boolean;
}

const milkBatches: Map<string, MilkBatchRecord> = new Map();
const stockRefills: Map<string, StockRefillRecord> = new Map();
const stockTransactions: Array<StockTransactionRecord> = [];

// Seed 2 initial batches for ATM-KA-001 (summing to 84.5 Litres)
const batch1Expiry = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
const batch1: MilkBatchRecord = {
  batchId: 'BATCH-20261101-01',
  batchNumber: 'BATCH-20261101-01',
  machineId: 'ATM-KA-001',
  supplierName: 'Karnataka Milk Federation (Nandini Dairy)',
  receivedLitres: 50.0,
  remainingLitres: 34.5,
  expiryDate: batch1Expiry,
  storageTemperatureCelsius: 3.8,
  receivedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  receivedByStaffId: seedStaff.staffId!,
  receivedByStaffName: seedStaff.fullName,
  status: 'ACTIVE',
  notes: 'Cold chain verified at 3.8°C upon kiosk reception.',
};
milkBatches.set(batch1.batchId, batch1);

const batch2Expiry = new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0];
const batch2: MilkBatchRecord = {
  batchId: 'BATCH-20261101-02',
  batchNumber: 'BATCH-20261101-02',
  machineId: 'ATM-KA-001',
  supplierName: 'Karnataka Milk Federation (Nandini Dairy)',
  receivedLitres: 50.0,
  remainingLitres: 50.0,
  expiryDate: batch2Expiry,
  storageTemperatureCelsius: 3.6,
  receivedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  receivedByStaffId: seedStaff.staffId!,
  receivedByStaffName: seedStaff.fullName,
  status: 'ACTIVE',
  notes: 'Second compartment tank reserve.',
};
milkBatches.set(batch2.batchId, batch2);

// Seed Refill Logs
stockRefills.set('RFL-001', {
  refillId: 'RFL-001',
  machineId: 'ATM-KA-001',
  batchNumber: batch1.batchNumber,
  supplierName: batch1.supplierName,
  quantityLitres: 50.0,
  expiryDate: batch1.expiryDate,
  temperatureCelsius: batch1.storageTemperatureCelsius,
  staffId: seedStaff.staffId!,
  staffName: seedStaff.fullName,
  refillTimestamp: batch1.receivedAt,
  immutable: true,
  notes: 'Initial morning batch intake',
});

stockRefills.set('RFL-002', {
  refillId: 'RFL-002',
  machineId: 'ATM-KA-001',
  batchNumber: batch2.batchNumber,
  supplierName: batch2.supplierName,
  quantityLitres: 50.0,
  expiryDate: batch2.expiryDate,
  temperatureCelsius: batch2.storageTemperatureCelsius,
  staffId: seedStaff.staffId!,
  staffName: seedStaff.fullName,
  refillTimestamp: batch2.receivedAt,
  immutable: true,
  notes: 'Afternoon refill to maintain reserve stock',
});

// Seed initial stock transactions
stockTransactions.push({
  transactionId: 'TX-INIT-01',
  machineId: 'ATM-KA-001',
  type: 'REFILL',
  litres: 50.0,
  batchId: batch1.batchId,
  batchNumber: batch1.batchNumber,
  balanceAfterLitres: 50.0,
  timestamp: batch1.receivedAt,
  performedBy: `${seedStaff.fullName} (${seedStaff.staffId})`,
  notes: 'Initial refill',
});

stockTransactions.push({
  transactionId: 'TX-INIT-02',
  machineId: 'ATM-KA-001',
  type: 'REFILL',
  litres: 50.0,
  batchId: batch2.batchId,
  batchNumber: batch2.batchNumber,
  balanceAfterLitres: 100.0,
  timestamp: batch2.receivedAt,
  performedBy: `${seedStaff.fullName} (${seedStaff.staffId})`,
  notes: 'Secondary refill',
});

stockTransactions.push({
  transactionId: 'TX-INIT-03',
  machineId: 'ATM-KA-001',
  type: 'DISPENSE',
  litres: -15.5,
  batchId: batch1.batchId,
  batchNumber: batch1.batchNumber,
  balanceAfterLitres: 84.5,
  timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
  performedBy: 'ESP32 Dispenser System',
  notes: 'Aggregated earlier customer orders dispensed from Batch #1',
});

// Inventory Calculation Helpers
function getAvailableMilkStockLitres(machineId: string): number {
  const todayStr = new Date().toISOString().split('T')[0];
  let available = 0;
  for (const b of milkBatches.values()) {
    if (b.machineId === machineId && b.status === 'ACTIVE' && b.remainingLitres > 0) {
      if (b.expiryDate < todayStr) {
        b.status = 'EXPIRED';
      } else {
        available += b.remainingLitres;
      }
    }
  }
  return Number(available.toFixed(2));
}

// FEFO (First Expired, First Out) Stock Deduction
function deductStockFEFO(
  machineId: string,
  dispensedMl: number,
  orderId?: string,
  isPartial: boolean = false,
  unmeasuredEstimate: boolean = false
): { deductedLitres: number; batchesAffected: Array<{ batchNumber: string; deducted: number }> } {
  const neededLitres = Number((dispensedMl / 1000).toFixed(3));
  if (neededLitres <= 0) return { deductedLitres: 0, batchesAffected: [] };

  const todayStr = new Date().toISOString().split('T')[0];

  // FEFO: Sort active batches by expiryDate ascending (Earliest expiry first)
  const activeBatches = Array.from(milkBatches.values())
    .filter((b) => b.machineId === machineId && b.remainingLitres > 0 && b.status === 'ACTIVE')
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  let remainingToDeduct = neededLitres;
  const batchesAffected: Array<{ batchNumber: string; deducted: number }> = [];

  for (const batch of activeBatches) {
    if (remainingToDeduct <= 0) break;

    // Check expiry
    if (batch.expiryDate < todayStr) {
      batch.status = 'EXPIRED';
      continue;
    }

    const canDeduct = Math.min(batch.remainingLitres, remainingToDeduct);
    batch.remainingLitres = Number((batch.remainingLitres - canDeduct).toFixed(3));
    remainingToDeduct = Number((remainingToDeduct - canDeduct).toFixed(3));

    if (batch.remainingLitres <= 0.001) {
      batch.remainingLitres = 0;
      batch.status = 'EXHAUSTED';
    }

    batchesAffected.push({ batchNumber: batch.batchNumber, deducted: canDeduct });
  }

  // Recalculate machine current stock
  const newStock = getAvailableMilkStockLitres(machineId);
  machine.currentStockLiters = newStock;

  const actualDeducted = Number((neededLitres - Math.max(0, remainingToDeduct)).toFixed(3));

  const tx: StockTransactionRecord = {
    transactionId: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    machineId,
    type: isPartial ? 'PARTIAL_DISPENSE' : 'DISPENSE',
    litres: -actualDeducted,
    orderId,
    balanceAfterLitres: newStock,
    timestamp: new Date().toISOString(),
    performedBy: 'ESP32 Dispenser System',
    notes: `FEFO batch deduction across [${batchesAffected.map((b) => `${b.batchNumber}: -${b.deducted}L`).join(', ')}]`,
    unmeasuredEstimate,
  };
  stockTransactions.unshift(tx);
  if (stockTransactions.length > 500) stockTransactions.pop();

  logAudit(isPartial ? 'FEFO_PARTIAL_STOCK_DEDUCTED' : 'FEFO_STOCK_DEDUCTED', {
    orderId,
    dispensedMl,
    deductedLitres: actualDeducted,
    remainingStockLiters: newStock,
    batchesAffected,
    unmeasuredEstimate,
  });

  return { deductedLitres: actualDeducted, batchesAffected };
}

// Global Store
const orders: Map<string, OrderRecord> = new Map();
const dispensingJobs: Map<string, DispensingJob> = new Map();
const auditLogs: Array<{ id: string; timestamp: string; event: string; details: any }> = [];

function logAudit(event: string, details: any) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    event,
    details,
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 200) auditLogs.pop();
}

// Dynamic Merchant UPI Configuration
const MERCHANT_UPI_ID = process.env.MERCHANT_UPI_ID?.trim() || '9353944629@ibl';

function buildUpiPaymentUri(amountInr: number, upiId: string = MERCHANT_UPI_ID): string {
  const formattedAmount = Number.isInteger(amountInr) ? String(amountInr) : amountInr.toFixed(2);
  return `upi://pay?pa=${upiId}&pn=Smart%20Milk%20ATM&am=${formattedAmount}&cu=INR&tn=Milk%20Purchase`;
}

// Seed a couple of recent demonstration orders
const seedOrderId1 = 'ORD-20261101-0812';
orders.set(seedOrderId1, {
  orderId: seedOrderId1,
  customerId: 'cust_seed_1',
  customerName: 'Ananya Sharma',
  customerEmail: 'ananya.sharma@example.com',
  machineId: 'ATM-KA-001',
  quantityMl: 500,
  amountPaise: 3000,
  amountInr: 30,
  currency: 'INR',
  razorpayOrderId: 'order_DemoSeed123',
  razorpayPaymentId: 'pay_DemoSeedSuccess1',
  upiId: MERCHANT_UPI_ID,
  upiPaymentUri: buildUpiPaymentUri(30, MERCHANT_UPI_ID),
  paymentStatus: 'PAID',
  dispensingStatus: 'COMPLETED',
  dispensedMl: 500,
  gatewayMode: 'DEMO_SIMULATION',
  isSimulatedPayment: true,
  paymentVerificationType: 'DEMO_SIMULATED',
  createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  updatedAt: new Date(Date.now() - 3600000 * 2 + 30000).toISOString(),
});

const seedOrderId2 = 'ORD-20261101-0845';
orders.set(seedOrderId2, {
  orderId: seedOrderId2,
  customerId: 'cust_seed_2',
  customerName: 'Vikram Mehta',
  customerEmail: 'vikram.m@example.com',
  machineId: 'ATM-KA-001',
  quantityMl: 1000,
  amountPaise: 6000,
  amountInr: 60,
  currency: 'INR',
  razorpayOrderId: 'order_DemoSeed456',
  razorpayPaymentId: 'pay_DemoSeedSuccess2',
  upiId: MERCHANT_UPI_ID,
  upiPaymentUri: buildUpiPaymentUri(60, MERCHANT_UPI_ID),
  paymentStatus: 'PAID',
  dispensingStatus: 'COMPLETED',
  dispensedMl: 1000,
  gatewayMode: 'DEMO_SIMULATION',
  isSimulatedPayment: true,
  paymentVerificationType: 'DEMO_SIMULATED',
  createdAt: new Date(Date.now() - 1800000).toISOString(),
  updatedAt: new Date(Date.now() - 1800000 + 45000).toISOString(),
});

// Environment Configuration
// DEMO_MODE defaults to true so the application preview works out of the box without any external credentials.
const DEMO_MODE = process.env.DEMO_MODE !== 'false';

// Razorpay credentials are strictly OPTIONAL in demo mode.
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || null;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || null;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;
const APP_BASE_URL = process.env.APP_BASE_URL?.trim() || process.env.APP_URL?.trim() || 'http://localhost:3000';

// Webhook & Payment Replay Attack Prevention (Stores event IDs and payment IDs for deduplication)
const processedWebhookEventIds = new Set<string>();
const processedPaymentIds = new Set<string>();

// Constant-time hex/string signature comparison helper
function timingSafeMatch(expectedHex: string, receivedHex: string): boolean {
  try {
    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    const receivedBuf = Buffer.from(receivedHex, 'utf8');
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

// Validate genuine Razorpay key format (rzp_test_* or rzp_live_*)
const isValidRazorpayKey = (key: string | null): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    (trimmed.startsWith('rzp_test_') || trimmed.startsWith('rzp_live_')) &&
    !trimmed.toLowerCase().includes('placeholder') &&
    !trimmed.toLowerCase().includes('leave empty') &&
    trimmed.length > 12
  );
};

const isValidRazorpaySecret = (secret: string | null): boolean => {
  if (!secret) return false;
  const trimmed = secret.trim();
  return (
    trimmed.length >= 8 &&
    !trimmed.toLowerCase().includes('placeholder') &&
    !trimmed.toLowerCase().includes('leave empty')
  );
};

const isRazorpayConfigured = isValidRazorpayKey(RAZORPAY_KEY_ID) && isValidRazorpaySecret(RAZORPAY_KEY_SECRET);
const razorpayMode: 'LIVE' | 'TEST' | 'UNCONFIGURED' = !isRazorpayConfigured
  ? 'UNCONFIGURED'
  : RAZORPAY_KEY_ID?.startsWith('rzp_live_')
  ? 'LIVE'
  : 'TEST';
const isWebhookSecretConfigured = Boolean(RAZORPAY_WEBHOOK_SECRET && RAZORPAY_WEBHOOK_SECRET.length >= 8);
const isHttpsAppBaseUrl = APP_BASE_URL.startsWith('https://');
const isCustomDeviceSecretConfigured = Boolean(process.env.DEVICE_AUTH_SECRET?.trim());
const liveModeReady = Boolean(!DEMO_MODE && isRazorpayConfigured && razorpayMode === 'LIVE' && isWebhookSecretConfigured);

// Device Authentication Secret (ESP32 <-> Backend)
const DEVICE_AUTH_SECRET = process.env.DEVICE_AUTH_SECRET?.trim() || 'smart_milk_atm_esp32_device_secret_2026';

// Firebase Free-Tier / Starter Tier Configuration (No firebase-admin IAM dependency)
const FIREBASE_PROJECT_ID = 'khaki-bond-02ts5';
const FIREBASE_DATABASE_ID = 'ai-studio-smartmilkatmauto-c4271519-bd42-4ac7-9213-5b05d6aa0729';
const BOOTSTRAPPED_ADMIN_EMAIL = 'sanjayss9807@gmail.com';
const FIREBASE_MODE = 'STARTER_TIER_CLIENT_SDK';
const ADMIN_SDK_AVAILABLE = false;

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiresAt = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < cachedCertsExpiresAt) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${resp.status})`);
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await resp.json()) as Record<string, string>;
  cachedCertsExpiresAt = Date.now() + maxAgeSeconds * 1000;
  return cachedCerts;
}

function decodeBase64Url(str: string): Buffer {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

async function verifyFirebaseIdToken(idToken: string): Promise<{
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  firebase?: { sign_in_provider?: string };
}> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8'));
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'));

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid Firebase ID token algorithm or missing key ID');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Firebase token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error('Firebase token issuer mismatch');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Firebase token missing subject UID');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Firebase ID token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Firebase ID token issued-at time invalid');
  }

  const certs = await getFirebasePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Firebase public signing certificate not found for key ID');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const sigBuf = decodeBase64Url(sigB64);

  if (!verifier.verify(certPem, sigBuf)) {
    throw new Error('Invalid Firebase ID token RS256 signature');
  }

  return payload;
}

console.log(
  `[Backend] Firebase Free-Tier Client SDK Mode active (${FIREBASE_PROJECT_ID} / ${FIREBASE_DATABASE_ID}). Server-side firebase-admin IAM is disabled.`
);

// Helper: Authorize and create a single-use dispensing job (Idempotent: prevents duplicate dispensing)
function authorizeDispensingJob(
  order: OrderRecord,
  paymentId: string,
  verificationType: 'SIMULATED' | 'RAZORPAY_SIGNATURE'
): DispensingJob {
  const existingJob = dispensingJobs.get(`JOB-${order.orderId}`);
  if (existingJob) {
    // If dispensing is already pending, claimed, or completed, prevent duplicate job creation!
    logAudit('DUPLICATE_DISPENSING_PREVENTED', {
      orderId: order.orderId,
      jobId: existingJob.jobId,
      jobStatus: existingJob.status,
    });
    return existingJob;
  }

  processedPaymentIds.add(paymentId);
  order.paymentStatus = 'PAID';
  order.razorpayPaymentId = paymentId;
  order.dispensingStatus = 'PENDING_DISPENSE';
  order.gatewayMode = verificationType === 'SIMULATED' ? 'DEMO_SIMULATION' : razorpayMode === 'LIVE' ? 'RAZORPAY_LIVE' : 'RAZORPAY_TEST';
  order.isSimulatedPayment = verificationType === 'SIMULATED';
  order.paymentVerificationType =
    verificationType === 'SIMULATED'
      ? 'DEMO_SIMULATED'
      : razorpayMode === 'LIVE'
      ? 'RAZORPAY_LIVE_VERIFIED'
      : 'RAZORPAY_TEST_VERIFIED';

  // Generate a cryptographically secure, single-use dispensing token
  const tokenPrefix = verificationType === 'SIMULATED' ? 'DSP-AUTH-SIM' : 'DSP-AUTH-PROD';
  const dispensingToken = `${tokenPrefix}-${crypto.randomBytes(16).toString('hex')}`;
  order.dispensingToken = dispensingToken;
  order.updatedAt = new Date().toISOString();
  orders.set(order.orderId, order);

  // Match calibration for timing and pulses
  const matchedTier = priceTiers.find((t) => t.quantityMl === order.quantityMl);
  const targetRunTimeMs = matchedTier ? matchedTier.defaultRunTimeMs : Math.round((order.quantityMl / 50) * 1000);
  const targetPulses = Math.round(order.quantityMl * machine.pulsesPerMl);

  // Create single-use dispensing job for ESP32 claim
  const jobId = `JOB-${order.orderId}`;
  const job: DispensingJob = {
    jobId,
    orderId: order.orderId,
    machineId: order.machineId,
    quantityMl: order.quantityMl,
    amountInr: order.amountInr,
    dispensingToken,
    targetRunTimeMs,
    targetPulses,
    status: 'PENDING',
    dispensedMl: 0,
    pulsesCounted: 0,
  };

  dispensingJobs.set(jobId, job);

  // Update customer profile environmental metrics
  if (order.customerId && users.has(order.customerId)) {
    const usr = users.get(order.customerId)!;
    usr.bottlesSaved += Math.max(1, Math.round(order.quantityMl / 500));
    usr.totalMilkPurchasedMl += order.quantityMl;
    users.set(order.customerId, usr);
  }

  logAudit(verificationType === 'SIMULATED' ? 'SIMULATED_PAYMENT_CAPTURED' : 'PRODUCTION_PAYMENT_CAPTURED', {
    orderId: order.orderId,
    jobId,
    paymentId,
    quantityMl: order.quantityMl,
    dispensingToken,
    verificationType,
  });

  return job;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check endpoint for Google Cloud Run
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'smart-milk-atm',
    demoMode: DEMO_MODE,
    timestamp: new Date().toISOString(),
  });
});

// 1. System Config & Status (Only public, non-sensitive data sent to frontend)
app.get('/api/config', (_req, res) => {
  res.json({
    appName: 'SMART MILK ATM',
    tagline: 'Smart Milk ATM — Fresh Milk, Smart Payment, Zero Plastic Pouches',
    environmentalMessage: 'Say No to Plastic Milk Pouches — Bring Your Own Container.',
    demoMode: DEMO_MODE,
    // Security guard: When DEMO_MODE=true, do NOT expose live Razorpay Key ID to trigger real charges
    razorpayKeyId: !DEMO_MODE && isRazorpayConfigured ? RAZORPAY_KEY_ID : null,
    razorpayConfigured: isRazorpayConfigured,
    razorpayMode: DEMO_MODE && razorpayMode === 'LIVE' ? 'TEST' : razorpayMode,
    razorpayLiveDisabled: DEMO_MODE || razorpayMode !== 'LIVE',
    merchantUpiId: MERCHANT_UPI_ID,
    webhookConfigured: isWebhookSecretConfigured,
    liveModeReady,
    defaultMachineId: machine.machineId,
    currency: 'INR',
    serverTime: new Date().toISOString(),
    firebaseMode: FIREBASE_MODE,
    firebaseProjectId: FIREBASE_PROJECT_ID,
    firebaseDatabaseId: FIREBASE_DATABASE_ID,
    adminSdkAvailable: ADMIN_SDK_AVAILABLE,
  });
});

// Dedicated Public Payments Config for Razorpay Checkout (Never exposes secrets)
app.get('/api/payments/config', (_req, res) => {
  res.json({
    keyId: !DEMO_MODE && isRazorpayConfigured ? RAZORPAY_KEY_ID : null,
    isConfigured: isRazorpayConfigured,
    razorpayMode: DEMO_MODE && razorpayMode === 'LIVE' ? 'TEST' : razorpayMode,
    razorpayLiveDisabled: DEMO_MODE || razorpayMode !== 'LIVE',
    testMode: DEMO_MODE || razorpayMode === 'TEST',
    liveMode: !DEMO_MODE && razorpayMode === 'LIVE',
    liveModeReady,
    merchantUpiId: MERCHANT_UPI_ID,
    currency: 'INR',
    businessName: 'SMART MILK ATM',
    demoMode: DEMO_MODE,
    appBaseUrl: APP_BASE_URL,
    webhookConfigured: isWebhookSecretConfigured,
  });
});

// 2. Milk Pricing & Calibration Info
app.get('/api/pricing', (_req, res) => {
  res.json({
    tiers: priceTiers,
    perLiterPriceInr: 60,
    fatPercentage: 4.5,
    snfPercentage: 8.5,
    temperatureTarget: '2°C - 4°C',
    source: 'Cooperative Dairy Direct Farm Collection (Chilled, Pasteurized & Homogenized)',
  });
});

// Admin update pricing
app.post('/api/pricing', (req, res) => {
  const authUser = requireRole(req, res, ['admin']);
  if (!authUser) return;

  const { tiers, pulsesPerMl, maxRuntimeMs, relayActiveLow } = req.body;
  if (Array.isArray(tiers)) {
    priceTiers = tiers.map((t) => ({
      ...t,
      pricePaise: t.priceInr * 100,
    }));
  }
  if (typeof pulsesPerMl === 'number') machine.pulsesPerMl = pulsesPerMl;
  if (typeof maxRuntimeMs === 'number') machine.maxRuntimeMs = maxRuntimeMs;
  if (typeof relayActiveLow === 'boolean') machine.relayActiveLow = relayActiveLow;

  logAudit('PRICING_CALIBRATION_UPDATED', { tiers, pulsesPerMl, maxRuntimeMs, relayActiveLow, updatedBy: authUser.email });
  res.json({ success: true, tiers: priceTiers, machine });
});

// 2b. Customer Authentication & Profile Endpoints (Firebase-Aligned)
app.post('/api/auth/register', (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name must be at least 2 characters' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = Array.from(users.values()).find((u) => u.email === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
  }

  // Generate unique Firebase Authentication-style UID (strictly customer role; admin requires invite token)
  const uid = `cust_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const role: UserRole = 'customer';

  const newUser: UserRecord = {
    uid,
    email: cleanEmail,
    fullName: fullName.trim(),
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
    bottlesSaved: 0,
    totalMilkPurchasedMl: 0,
    authProvider: 'backend-scrypt',
  };

  users.set(uid, newUser);

  // Generate secure session bearer token
  const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
  userSessions.set(token, { uid, createdAt: Date.now() });

  logAudit('CUSTOMER_REGISTERED', { uid, email: cleanEmail, fullName: newUser.fullName, role });

  res.json({
    success: true,
    token,
    user: sanitizeUser(newUser),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let user = Array.from(users.values()).find((u) => u.email === cleanEmail);

  if (!user) {
    if (cleanEmail === 'sanjay.customer@example.com') {
      user = seedCustomer;
    } else if (cleanEmail === 'admin@smartmilkatm.in') {
      user = seedAdmin;
    } else if (cleanEmail === 'priya.staff@smartmilkatm.in') {
      user = seedStaff;
    } else {
      return res.status(401).json({ error: 'Invalid email address or password' });
    }
  }

  // Validate password against the specific salted scrypt hash
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email address or password' });
  }

  // Role-based status checks for Staff
  if (user.role === 'staff') {
    if (user.approvalStatus === 'PENDING') {
      return res.status(403).json({
        error: 'Your staff account application is pending Administrator approval. Please contact the dairy administrator.',
        approvalStatus: 'PENDING',
      });
    }
    if (user.approvalStatus === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Your staff account has been temporarily suspended by an Administrator.',
        approvalStatus: 'SUSPENDED',
      });
    }
    if (user.approvalStatus === 'REJECTED') {
      return res.status(403).json({
        error: 'Your staff registration application was declined.',
        approvalStatus: 'REJECTED',
      });
    }
  }

  const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
  userSessions.set(token, { uid: user.uid, createdAt: Date.now() });

  logAudit('USER_LOGGED_IN', { uid: user.uid, email: user.email, fullName: user.fullName, role: user.role });

  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

// Staff Registration (Creates an application with PENDING status requiring Admin approval)
app.post('/api/auth/staff-register', (req, res) => {
  const { fullName, email, phone, staffId, assignedMachineId, password } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name must be at least 2 characters' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid staff email address' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!staffId || typeof staffId !== 'string' || staffId.trim().length < 2) {
    return res.status(400).json({ error: 'Staff ID / Employee Code is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = Array.from(users.values()).find((u) => u.email === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const uid = `stf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const newStaff: UserRecord = {
    uid,
    email: cleanEmail,
    fullName: fullName.trim(),
    phone: phone ? String(phone).trim() : undefined,
    passwordHash: hashPassword(password),
    role: 'staff',
    staffId: staffId.trim().toUpperCase(),
    assignedMachineId: assignedMachineId?.trim() || machine.machineId,
    approvalStatus: 'PENDING', // Requires Admin approval before login!
    createdAt: new Date().toISOString(),
    bottlesSaved: 0,
    totalMilkPurchasedMl: 0,
    authProvider: 'backend-scrypt',
  };

  users.set(uid, newStaff);

  logAudit('STAFF_REGISTRATION_SUBMITTED', {
    uid,
    staffId: newStaff.staffId,
    email: cleanEmail,
    fullName: newStaff.fullName,
    assignedMachineId: newStaff.assignedMachineId,
  });

  res.json({
    success: true,
    message: 'Staff registration application submitted. An administrator must approve your account before you can log in.',
    staffId: newStaff.staffId,
  });
});

// Admin Registration via Secure Invite Token
app.post('/api/auth/admin-register', (req, res) => {
  const { fullName, email, phone, password, inviteToken } = req.body;

  if (!inviteToken || !adminInviteTokens.has(inviteToken.trim())) {
    return res.status(403).json({ error: 'Invalid or expired Administrator Invite Token' });
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name must be at least 2 characters' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = Array.from(users.values()).find((u) => u.email === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  // Consume invite token
  adminInviteTokens.delete(inviteToken.trim());

  const uid = `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const newAdmin: UserRecord = {
    uid,
    email: cleanEmail,
    fullName: fullName.trim(),
    phone: phone ? String(phone).trim() : undefined,
    passwordHash: hashPassword(password),
    role: 'admin',
    createdAt: new Date().toISOString(),
    bottlesSaved: 0,
    totalMilkPurchasedMl: 0,
    authProvider: 'backend-scrypt',
  };

  users.set(uid, newAdmin);

  const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
  userSessions.set(token, { uid, createdAt: Date.now() });

  logAudit('ADMIN_REGISTERED_VIA_INVITE', { uid, email: cleanEmail, fullName: newAdmin.fullName });

  res.json({
    success: true,
    token,
    user: sanitizeUser(newAdmin),
  });
});

// Firebase Authentication ID Token Verification (Zero IAM / Free-Tier Compatible)
app.post('/api/auth/firebase-sync', async (req, res) => {
  const { idToken, fullName } = req.body || {};
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'Missing Firebase ID token' });
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const cleanEmail = (decoded.email || '').trim().toLowerCase();
    const provider = decoded.firebase?.sign_in_provider || 'firebase';
    const isVerified = Boolean(decoded.email_verified);

    if (!cleanEmail) {
      return res.status(400).json({ error: 'Firebase account does not have an email address' });
    }

    // Lookup existing user by Firebase UID or email; never trust client-submitted role
    let existingUser =
      users.get(decoded.sub) || Array.from(users.values()).find((u) => u.email === cleanEmail);

    let resolvedRole: UserRole = existingUser?.role || 'customer';
    if (isVerified && cleanEmail === BOOTSTRAPPED_ADMIN_EMAIL) {
      resolvedRole = 'admin';
    }

    if (existingUser) {
      if (existingUser.role === 'staff') {
        if (existingUser.approvalStatus === 'PENDING') {
          return res.status(403).json({
            error: 'Your staff account application is pending Administrator approval.',
            approvalStatus: 'PENDING',
          });
        }
        if (existingUser.approvalStatus === 'SUSPENDED' || existingUser.approvalStatus === 'REJECTED') {
          return res.status(403).json({
            error: `Your staff account status is ${existingUser.approvalStatus}.`,
            approvalStatus: existingUser.approvalStatus,
          });
        }
      }

      if (resolvedRole === 'admin') {
        existingUser.role = 'admin';
      }
      existingUser.authProvider = provider;
      if (fullName && typeof fullName === 'string' && fullName.trim().length > 1) {
        existingUser.fullName = fullName.trim();
      }
      users.set(existingUser.uid, existingUser);
    } else {
      existingUser = {
        uid: decoded.sub,
        email: cleanEmail,
        fullName:
          (typeof fullName === 'string' && fullName.trim()) ||
          decoded.name ||
          cleanEmail.split('@')[0],
        passwordHash: '',
        role: resolvedRole,
        createdAt: new Date().toISOString(),
        bottlesSaved: 0,
        totalMilkPurchasedMl: 0,
        authProvider: provider,
      };
      users.set(existingUser.uid, existingUser);
    }

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    userSessions.set(token, { uid: existingUser.uid, createdAt: Date.now() });

    logAudit('FIREBASE_USER_AUTHENTICATED', {
      uid: existingUser.uid,
      email: existingUser.email,
      role: existingUser.role,
      provider,
      emailVerified: isVerified,
    });

    return res.json({
      success: true,
      token,
      user: sanitizeUser(existingUser),
    });
  } catch (err: any) {
    logAudit('FIREBASE_TOKEN_VERIFY_FAILED', { error: err?.message });
    return res.status(401).json({
      error: err?.message || 'Failed to verify Firebase Authentication token',
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated or session expired' });
  }
  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    userSessions.delete(token);
  }
  res.json({ success: true });
});

// 3. Create Order (Server verifies authenticated customer identity, genuine price, and stock availability)
app.post('/api/orders', (req, res) => {
  const { quantityMl, machineId } = req.body;

  if (!quantityMl || quantityMl <= 0) {
    return res.status(400).json({ error: 'Invalid milk quantity requested' });
  }

  const targetMachineId = machineId || machine.machineId;
  const requestedLitres = Number(quantityMl) / 1000;
  const availableStock = getAvailableMilkStockLitres(targetMachineId);

  // STRICT INVENTORY CHECK: Prevent orders when available unexpired stock is insufficient
  if (availableStock < requestedLitres) {
    return res.status(400).json({
      error: `Insufficient milk stock in machine (Available: ${availableStock.toFixed(1)} L, Requested: ${requestedLitres.toFixed(1)} L). LOW MILK STOCK – REFILL REQUIRED.`,
      code: 'INSUFFICIENT_STOCK',
      availableStockLiters: availableStock,
    });
  }

  // SECURE: Retrieve customer identity directly from the authenticated session
  // Do not trust customerId or customerName submitted by frontend JavaScript
  const authUser = getAuthenticatedUser(req);

  let customerId: string;
  let customerName: string;
  let customerEmail: string;

  if (authUser) {
    customerId = authUser.uid;
    customerName = authUser.fullName;
    customerEmail = authUser.email;
  } else {
    // Guest checkout fallback (never use "Valued Customer")
    customerId = 'guest-user';
    customerName = req.body.customerName?.trim() || 'Guest Customer';
    customerEmail = (req.body.customerEmail || 'guest@smartmilkatm.in').trim();
  }

  // Find tier or calculate proportional rate (₹60 per 1000ml = ₹0.06/ml)
  const matchedTier = priceTiers.find((t) => t.quantityMl === Number(quantityMl));
  const amountInr = matchedTier ? matchedTier.priceInr : Math.round((Number(quantityMl) * 60) / 1000);
  const amountPaise = amountInr * 100;

  const orderId = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
  const upiPaymentUri = buildUpiPaymentUri(amountInr, MERCHANT_UPI_ID);

  const order: OrderRecord = {
    orderId,
    customerId,
    customerName,
    customerEmail,
    machineId: targetMachineId,
    quantityMl: Number(quantityMl),
    amountPaise,
    amountInr,
    currency: 'INR',
    upiId: MERCHANT_UPI_ID,
    upiPaymentUri,
    paymentStatus: 'PENDING',
    dispensingStatus: 'WAITING_PAYMENT',
    gatewayMode: DEMO_MODE ? 'DEMO_SIMULATION' : razorpayMode === 'LIVE' ? 'RAZORPAY_LIVE' : 'RAZORPAY_TEST',
    isSimulatedPayment: DEMO_MODE,
    paymentVerificationType: 'NONE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.set(orderId, order);
  logAudit('ORDER_CREATED', { orderId, quantityMl, amountInr, customerId, customerName, customerEmail, availableStock, upiId: MERCHANT_UPI_ID });

  res.json({
    success: true,
    order,
  });
});

// 3b. Update Unpaid Order Quantity on Payment Page (Re-verifies stock & recalculates server price + UPI URI)
app.patch('/api/orders/:orderId/quantity', (req, res) => {
  const { orderId } = req.params;
  const { quantityMl } = req.body;
  const order = orders.get(orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (order.paymentStatus === 'PAID' || order.dispensingStatus !== 'WAITING_PAYMENT') {
    return res.status(400).json({ error: 'Cannot change quantity after payment has already been verified.' });
  }

  const parsedQty = Number(quantityMl);
  if (!parsedQty || parsedQty <= 0) {
    return res.status(400).json({ error: 'Invalid milk quantity requested' });
  }

  const requestedLitres = parsedQty / 1000;
  const availableStock = getAvailableMilkStockLitres(order.machineId);
  if (availableStock < requestedLitres) {
    return res.status(400).json({
      error: `Insufficient milk stock (Available: ${availableStock.toFixed(1)} L, Requested: ${requestedLitres.toFixed(1)} L).`,
      code: 'INSUFFICIENT_STOCK',
    });
  }

  const matchedTier = priceTiers.find((t) => t.quantityMl === parsedQty);
  const amountInr = matchedTier ? matchedTier.priceInr : Math.round((parsedQty * 60) / 1000);
  const amountPaise = amountInr * 100;
  const upiPaymentUri = buildUpiPaymentUri(amountInr, MERCHANT_UPI_ID);

  order.quantityMl = parsedQty;
  order.amountInr = amountInr;
  order.amountPaise = amountPaise;
  order.upiId = MERCHANT_UPI_ID;
  order.upiPaymentUri = upiPaymentUri;
  order.paymentStatus = 'PENDING';
  order.failureReason = undefined;
  order.razorpayOrderId = undefined;
  order.updatedAt = new Date().toISOString();
  orders.set(orderId, order);

  logAudit('ORDER_QUANTITY_UPDATED', { orderId, quantityMl: parsedQty, amountInr, upiPaymentUri });

  res.json({
    success: true,
    order,
    upiId: MERCHANT_UPI_ID,
    upiIntentString: upiPaymentUri,
  });
});

// 4. Create Payment Gateway Order (DEMO_MODE safety lock enforced first; Live Razorpay API when DEMO_MODE=false)
app.post('/api/payments/create', async (req, res) => {
  const { orderId } = req.body;
  const order = orders.get(orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.paymentStatus === 'PAID') {
    return res.status(400).json({ error: 'Order has already been paid and verified. Duplicate payment blocked.' });
  }

  const upiIntentString = buildUpiPaymentUri(order.amountInr, MERCHANT_UPI_ID);
  order.upiId = MERCHANT_UPI_ID;
  order.upiPaymentUri = upiIntentString;

  // SAFETY GUARD: While DEMO_MODE=true, NEVER initiate real Razorpay Live transactions or real dispensing!
  if (DEMO_MODE) {
    const demoOrderId =
      order.razorpayOrderId && order.razorpayOrderId.startsWith('order_sim_')
        ? order.razorpayOrderId
        : `order_sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    order.razorpayOrderId = demoOrderId;
    order.updatedAt = new Date().toISOString();
    orders.set(orderId, order);

    logAudit('DEMO_PAYMENT_ORDER_INITIALIZED', {
      orderId,
      demoOrderId,
      amountPaise: order.amountPaise,
      upiId: MERCHANT_UPI_ID,
      liveKeysDetectedInEnv: razorpayMode === 'LIVE',
    });

    return res.json({
      success: true,
      orderId: order.orderId,
      razorpayOrderId: demoOrderId,
      quantityMl: order.quantityMl,
      amountPaise: order.amountPaise,
      amountInr: order.amountInr,
      currency: order.currency,
      keyId: null, // Safety lock: never pass live key to Checkout while DEMO_MODE=true
      upiId: MERCHANT_UPI_ID,
      upiIntentString,
      testMode: true,
      liveMode: false,
      demoMode: true,
      razorpayLiveDisabled: true,
      gatewayMode: 'SIMULATED',
      razorpayMode: razorpayMode === 'LIVE' ? 'TEST' : razorpayMode,
    });
  }

  // PRODUCTION / LIVE MODE (DEMO_MODE=false): Requires valid Razorpay credentials
  if (!isRazorpayConfigured || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return res.status(503).json({
      error: 'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in secure backend environment variables.',
      code: 'GATEWAY_CREDENTIALS_MISSING',
    });
  }

  // Idempotency: reuse existing Razorpay order if already created for this unpaid order
  if (order.razorpayOrderId && order.razorpayOrderId.startsWith('order_') && !order.razorpayOrderId.startsWith('order_sim_') && order.paymentStatus === 'PENDING') {
    return res.json({
      success: true,
      orderId: order.orderId,
      razorpayOrderId: order.razorpayOrderId,
      amountPaise: order.amountPaise,
      amountInr: order.amountInr,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      testMode: razorpayMode === 'TEST',
      liveMode: razorpayMode === 'LIVE',
      demoMode: false,
      gatewayMode: razorpayMode === 'LIVE' ? 'RAZORPAY_LIVE' : 'RAZORPAY_TEST',
      razorpayMode,
    });
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: order.amountPaise,
        currency: order.currency,
        receipt: order.orderId,
        notes: {
          machineId: order.machineId,
          quantityMl: String(order.quantityMl),
          customerEmail: order.customerEmail,
          source: 'Smart Milk ATM',
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody: any = await rzpRes.json().catch(() => ({}));
      logAudit('RAZORPAY_ORDER_CREATE_FAILED', { status: rzpRes.status, errBody });
      return res.status(rzpRes.status).json({
        error: `Razorpay API order creation failed: ${errBody?.error?.description || rzpRes.statusText}`,
        code: 'RAZORPAY_ORDER_CREATE_FAILED',
      });
    }

    const rzpData: any = await rzpRes.json();
    if (rzpData.amount !== order.amountPaise || rzpData.currency !== order.currency) {
      logAudit('RAZORPAY_ORDER_MISMATCH', { expected: order.amountPaise, received: rzpData.amount });
      return res.status(502).json({ error: 'Razorpay returned mismatched order amount or currency.' });
    }

    order.razorpayOrderId = rzpData.id;
    order.paymentStatus = 'PENDING';
    order.updatedAt = new Date().toISOString();
    orders.set(orderId, order);
    logAudit('RAZORPAY_API_ORDER_CREATED', {
      orderId,
      razorpayOrderId: rzpData.id,
      amountPaise: order.amountPaise,
      razorpayMode,
    });

    const upiIntentString = buildUpiPaymentUri(order.amountInr, MERCHANT_UPI_ID);

    return res.json({
      success: true,
      orderId: order.orderId,
      razorpayOrderId: rzpData.id,
      quantityMl: order.quantityMl,
      amountPaise: order.amountPaise,
      amountInr: order.amountInr,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      upiId: MERCHANT_UPI_ID,
      upiIntentString,
      testMode: razorpayMode === 'TEST',
      liveMode: razorpayMode === 'LIVE',
      demoMode: false,
      gatewayMode: razorpayMode === 'LIVE' ? 'RAZORPAY_LIVE' : 'RAZORPAY_TEST',
      razorpayMode,
    });
  } catch (apiErr: any) {
    logAudit('RAZORPAY_ORDER_CREATE_NETWORK_ERROR', { error: apiErr.message });
    return res.status(502).json({ error: 'Network error communicating with Razorpay API: ' + apiErr.message });
  }
});

// 5. Verify Payment & Authorize Dispensing (Signature + Order ID + Amount + Currency + Capture State)
app.post('/api/payments/verify', async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, simulated } = req.body;

  const order = orders.get(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // DUPLICATE PAYMENT CHECK: Never authorize duplicate dispensing for an already paid order!
  if (order.paymentStatus === 'PAID') {
    const existingJob = dispensingJobs.get(`JOB-${order.orderId}`);
    return res.json({
      success: true,
      message: 'Payment already verified and captured. Duplicate payment blocked.',
      order,
      job: existingJob || null,
    });
  }

  // PATHWAY A: SIMULATED PAYMENT VERIFICATION (Strictly locked to DEMO_MODE=true)
  if (simulated) {
    if (!DEMO_MODE) {
      logAudit('SECURITY_VIOLATION_SIMULATION_ATTEMPTED_IN_LIVE', { orderId, ip: req.ip });
      return res.status(403).json({
        error: 'Simulated payment verification is strictly disabled when DEMO_MODE=false. Verified Razorpay capture required.',
        code: 'SIMULATION_FORBIDDEN',
      });
    }

    if (order.orderId !== orderId) {
      return res.status(400).json({ error: 'Order reference mismatch' });
    }

    const simPaymentId = `pay_sim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const job = authorizeDispensingJob(order, simPaymentId, 'SIMULATED');

    return res.json({
      success: true,
      status: 'CAPTURED',
      message: 'Demo payment verified. Dispensing authorized via simulation pathway.',
      order,
      job: {
        jobId: job.jobId,
        dispensingToken: job.dispensingToken,
        quantityMl: job.quantityMl,
      },
      verificationMethod: 'DEMO_SIMULATION',
    });
  }

  // PATHWAY B: CRYPTOGRAPHIC & SERVER-API RAZORPAY VERIFICATION
  if (!isRazorpayConfigured || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return res.status(503).json({
      error: 'Razorpay payment verification failed: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured on the server.',
      code: 'RAZORPAY_SECRET_MISSING',
    });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      error: 'Missing required Razorpay payment signature parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature).',
    });
  }

  // Prevent payment ID replay across distinct orders
  if (processedPaymentIds.has(razorpay_payment_id)) {
    logAudit('DUPLICATE_PAYMENT_ID_REJECTED', { orderId, razorpay_payment_id });
    return res.status(409).json({
      error: 'Duplicate payment ID detected. This payment has already been redeemed.',
      code: 'DUPLICATE_PAYMENT_ID',
    });
  }

  // Verify razorpay_order_id matches the order created by our backend
  if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
    logAudit('ORDER_ID_MISMATCH', {
      orderId,
      expectedRazorpayOrderId: order.razorpayOrderId,
      receivedRazorpayOrderId: razorpay_order_id,
    });
    return res.status(400).json({
      error: 'Razorpay Order ID mismatch. Transaction cannot be verified against this order.',
      code: 'ORDER_ID_MISMATCH',
    });
  }

  try {
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (!timingSafeMatch(generatedSignature, razorpay_signature)) {
      order.paymentStatus = 'FAILED';
      order.failureReason = 'Cryptographic signature mismatch';
      order.updatedAt = new Date().toISOString();
      orders.set(orderId, order);
      logAudit('RAZORPAY_SIGNATURE_MISMATCH', { orderId, razorpay_order_id, razorpay_payment_id });
      return res.status(400).json({ error: 'Invalid payment signature. Razorpay cryptographic verification failed.' });
    }
  } catch (err: any) {
    logAudit('PAYMENT_SIGNATURE_CRYPTO_ERROR', { error: err.message, orderId });
    return res.status(500).json({ error: 'Cryptographic signature verification error: ' + err.message });
  }

  // Authoritative Razorpay Server API check: verify amount, currency, order_id, and capture status
  try {
    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpPaymentRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });

    if (!rzpPaymentRes.ok) {
      const errBody: any = await rzpPaymentRes.json().catch(() => ({}));
      logAudit('RAZORPAY_PAYMENT_FETCH_FAILED', { orderId, razorpay_payment_id, status: rzpPaymentRes.status, errBody });
      return res.status(502).json({
        error: `Unable to confirm payment status with Razorpay server: ${errBody?.error?.description || rzpPaymentRes.statusText}`,
        code: 'RAZORPAY_FETCH_ERROR',
      });
    }

    const paymentEntity: any = await rzpPaymentRes.json();

    // Verify order_id, amount, and currency strictly match backend order
    if (paymentEntity.order_id !== order.razorpayOrderId) {
      logAudit('RAZORPAY_API_ORDER_MISMATCH', { orderId, expected: order.razorpayOrderId, received: paymentEntity.order_id });
      return res.status(400).json({ error: 'Razorpay payment order_id does not match backend order.' });
    }

    if (Number(paymentEntity.amount) !== order.amountPaise) {
      logAudit('RAZORPAY_AMOUNT_MISMATCH', { orderId, expectedPaise: order.amountPaise, paidPaise: paymentEntity.amount });
      return res.status(400).json({ error: 'Payment amount mismatch detected. Dispensing blocked.' });
    }

    if (String(paymentEntity.currency).toUpperCase() !== order.currency.toUpperCase()) {
      logAudit('RAZORPAY_CURRENCY_MISMATCH', { orderId, expected: order.currency, received: paymentEntity.currency });
      return res.status(400).json({ error: 'Payment currency mismatch detected. Dispensing blocked.' });
    }

    // Handle Payment States: CAPTURED vs AUTHORIZED/PENDING vs FAILED
    if (paymentEntity.status === 'failed') {
      order.paymentStatus = 'FAILED';
      order.razorpayPaymentId = razorpay_payment_id;
      order.failureReason = paymentEntity.error_description || 'Payment failed at Razorpay';
      order.updatedAt = new Date().toISOString();
      orders.set(orderId, order);
      logAudit('RAZORPAY_PAYMENT_FAILED_STATUS', { orderId, razorpay_payment_id, reason: order.failureReason });
      return res.status(400).json({
        success: false,
        status: 'FAILED',
        error: order.failureReason,
        order,
      });
    }

    if (paymentEntity.status === 'authorized' || paymentEntity.status === 'created') {
      order.paymentStatus = 'PENDING';
      order.razorpayPaymentId = razorpay_payment_id;
      order.dispensingStatus = 'WAITING_PAYMENT';
      order.updatedAt = new Date().toISOString();
      orders.set(orderId, order);
      logAudit('RAZORPAY_PAYMENT_PENDING_CAPTURE', { orderId, razorpay_payment_id, status: paymentEntity.status });
      return res.status(202).json({
        success: false,
        status: 'PENDING',
        message: 'Payment is authorized and pending final capture. Dispensing will unlock automatically once captured.',
        order,
      });
    }

    if (paymentEntity.status !== 'captured') {
      return res.status(400).json({
        success: false,
        status: paymentEntity.status?.toUpperCase() || 'UNKNOWN',
        error: `Payment status is '${paymentEntity.status}'. Only captured payments authorize dispensing.`,
        order,
      });
    }
  } catch (verifyErr: any) {
    logAudit('RAZORPAY_API_VERIFY_EXCEPTION', { orderId, error: verifyErr.message });
    return res.status(502).json({ error: 'Failed to verify payment details with Razorpay: ' + verifyErr.message });
  }

  // Payment is verified, amount/currency/order matched, and status is CAPTURED
  const job = authorizeDispensingJob(order, razorpay_payment_id, 'RAZORPAY_SIGNATURE');

  return res.json({
    success: true,
    status: 'CAPTURED',
    message: 'Razorpay payment verified and captured successfully. Dispensing authorized.',
    order,
    job: {
      jobId: job.jobId,
      dispensingToken: job.dispensingToken,
      quantityMl: job.quantityMl,
    },
    verificationMethod: 'RAZORPAY_HMAC_AND_API_CAPTURE',
  });
});

// 5b. Payment Failure Reporting (Never touches dispensing)
app.post('/api/payments/failure', (req, res) => {
  const { orderId, errorDescription, errorCode, paymentId } = req.body;
  const order = orders.get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'FAILED';
    order.dispensingStatus = 'WAITING_PAYMENT';
    if (paymentId) order.razorpayPaymentId = paymentId;
    order.failureReason = errorDescription || 'Payment transaction failed or cancelled by user.';
    order.updatedAt = new Date().toISOString();
    orders.set(orderId, order);
    logAudit('PAYMENT_FAILED_RECORDED', { orderId, errorDescription, errorCode, paymentId });
  }

  res.json({
    success: true,
    order,
    message: 'Payment failure recorded',
  });
});

// 5c. Check Authoritative Payment Status for an Order (Polls backend & Razorpay API in Live/Test mode)
app.get('/api/payments/:orderId/status', async (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // If still PENDING and we are in non-demo Razorpay mode with a genuine Razorpay Order ID, query Razorpay Order Payments
  if (
    !DEMO_MODE &&
    order.paymentStatus === 'PENDING' &&
    order.razorpayOrderId &&
    !order.razorpayOrderId.startsWith('order_sim_') &&
    isRazorpayConfigured &&
    RAZORPAY_KEY_ID &&
    RAZORPAY_KEY_SECRET
  ) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const rzpRes = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(order.razorpayOrderId)}/payments`,
        { headers: { Authorization: authHeader } }
      );
      if (rzpRes.ok) {
        const list: any = await rzpRes.json();
        const items: any[] = list?.items || [];
        const captured = items.find(
          (p) =>
            p.status === 'captured' &&
            Number(p.amount) === order.amountPaise &&
            String(p.currency).toUpperCase() === order.currency.toUpperCase() &&
            !processedPaymentIds.has(p.id)
        );
        if (captured) {
          authorizeDispensingJob(order, captured.id, 'RAZORPAY_SIGNATURE');
          logAudit('ORDER_STATUS_SYNCED_CAPTURED', { orderId: order.orderId, paymentId: captured.id });
        } else {
          const failed = items.find((p) => p.status === 'failed');
          if (failed && items.every((p) => p.status === 'failed')) {
            order.paymentStatus = 'FAILED';
            order.failureReason = failed.error_description || 'Payment failed';
            order.updatedAt = new Date().toISOString();
            orders.set(order.orderId, order);
          }
        }
      }
    } catch {
      // Ignore transient network errors during status poll
    }
  }

  const job = dispensingJobs.get(`JOB-${order.orderId}`);
  res.json({
    order,
    paymentStatus: order.paymentStatus,
    dispensingStatus: order.dispensingStatus,
    dispensingAuthorized: order.paymentStatus === 'PAID' && Boolean(job),
  });
});

// 6. Razorpay Webhook Endpoint (Server-to-Server, Mandatory Raw-Body HMAC-SHA256, Amount/Currency/Order Verification & Replay Protected)
app.post('/api/webhooks/razorpay', (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBuf = (req as any).rawBody as Buffer | undefined;

  if (!RAZORPAY_WEBHOOK_SECRET) {
    logAudit('WEBHOOK_REJECTED_NO_SECRET', { ip: req.ip });
    return res.status(503).json({ error: 'RAZORPAY_WEBHOOK_SECRET not configured on backend. Webhook verification is mandatory.' });
  }

  if (!signature) {
    logAudit('WEBHOOK_MISSING_SIGNATURE', { ip: req.ip });
    return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
  }

  if (!rawBuf || !Buffer.isBuffer(rawBuf)) {
    logAudit('WEBHOOK_MISSING_RAW_BODY', { ip: req.ip });
    return res.status(400).json({ error: 'Raw request body unavailable for webhook signature verification' });
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBuf)
      .digest('hex');

    if (!timingSafeMatch(expectedSignature, signature)) {
      logAudit('WEBHOOK_INVALID_SIGNATURE', { signatureReceived: signature });
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  } catch (e: any) {
    return res.status(400).json({ error: 'Webhook signature validation failed: ' + e.message });
  }

  const event = req.body?.event;
  const eventId = req.body?.event_id || (req.headers['x-razorpay-event-id'] as string) || req.body?.payload?.payment?.entity?.id;
  const payload = req.body?.payload;

  // Replay Attack Prevention
  if (eventId) {
    if (processedWebhookEventIds.has(eventId)) {
      logAudit('WEBHOOK_REPLAY_IGNORED', { eventId, event });
      return res.json({ status: 'ignored_duplicate_event', eventId });
    }
    processedWebhookEventIds.add(eventId);
    if (processedWebhookEventIds.size > 2000) {
      const first = processedWebhookEventIds.values().next().value;
      if (first) processedWebhookEventIds.delete(first);
    }
  }

  logAudit('WEBHOOK_PROCESSED', { event, eventId, entity: payload?.payment?.entity?.id });

  const paymentEntity = payload?.payment?.entity;
  const rzpOrderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;

  if (event === 'payment.captured' || event === 'order.paid') {
    for (const [_id, ord] of orders.entries()) {
      if (ord.razorpayOrderId === rzpOrderId) {
        // Verify amount, currency, and prevent duplicate payments
        const paidAmount = Number(paymentEntity?.amount ?? ord.amountPaise);
        const paidCurrency = String(paymentEntity?.currency ?? ord.currency).toUpperCase();

        if (paidAmount !== ord.amountPaise || paidCurrency !== ord.currency.toUpperCase()) {
          logAudit('WEBHOOK_AMOUNT_CURRENCY_MISMATCH', {
            orderId: ord.orderId,
            expectedPaise: ord.amountPaise,
            paidAmount,
            expectedCurrency: ord.currency,
            paidCurrency,
          });
          break;
        }

        const resolvedPaymentId = paymentId || `pay_wh_${Date.now()}`;
        if (ord.paymentStatus !== 'PAID' && !processedPaymentIds.has(resolvedPaymentId)) {
          authorizeDispensingJob(ord, resolvedPaymentId, 'RAZORPAY_SIGNATURE');
          logAudit('WEBHOOK_ORDER_MARKED_PAID', { orderId: ord.orderId, rzpOrderId, paymentId: resolvedPaymentId });
        }
        break;
      }
    }
  } else if (event === 'payment.authorized') {
    for (const [_id, ord] of orders.entries()) {
      if (ord.razorpayOrderId === rzpOrderId && ord.paymentStatus !== 'PAID') {
        ord.paymentStatus = 'PENDING';
        if (paymentId) ord.razorpayPaymentId = paymentId;
        ord.updatedAt = new Date().toISOString();
        orders.set(ord.orderId, ord);
        logAudit('WEBHOOK_PAYMENT_AUTHORIZED_PENDING', { orderId: ord.orderId, rzpOrderId, paymentId });
        break;
      }
    }
  } else if (event === 'payment.failed') {
    const errReason = paymentEntity?.error_description || 'Payment failed via Razorpay';

    for (const [_id, ord] of orders.entries()) {
      if (ord.razorpayOrderId === rzpOrderId && ord.paymentStatus !== 'PAID') {
        ord.paymentStatus = 'FAILED';
        ord.dispensingStatus = 'WAITING_PAYMENT';
        if (paymentId) ord.razorpayPaymentId = paymentId;
        ord.failureReason = errReason;
        ord.updatedAt = new Date().toISOString();
        orders.set(ord.orderId, ord);
        logAudit('WEBHOOK_PAYMENT_MARKED_FAILED', { orderId: ord.orderId, rzpOrderId, errReason });
        break;
      }
    }
  }

  res.json({ status: 'ok', event, eventId });
});

// 7. Get Order Details (Restricted to order owner, staff, or admin; guest orders allowed for walk-up checkout)
app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const authUser = getAuthenticatedUser(req);
  if (order.customerId !== 'guest-user') {
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required to view this order.' });
    }
    if (authUser.role !== 'admin' && authUser.role !== 'staff') {
      if (order.customerId !== authUser.uid && order.customerEmail.toLowerCase() !== authUser.email.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to view another customer\'s order.' });
      }
    }
  }

  const job = dispensingJobs.get(`JOB-${order.orderId}`);

  res.json({
    order,
    job: job || null,
    machineStatus: machine.status,
  });
});

// List Orders (Filtered by authenticated customer identity; admin/staff see kiosk orders)
app.get('/api/orders', (req, res) => {
  const authUser = getAuthenticatedUser(req);
  let allOrders = Array.from(orders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (authUser) {
    if (authUser.role !== 'admin' && authUser.role !== 'staff') {
      // Customer: strictly filter to only their own orders
      allOrders = allOrders.filter(
        (o) => o.customerId === authUser.uid || o.customerEmail.toLowerCase() === authUser.email.toLowerCase()
      );
    }
  } else {
    // Unauthenticated guest: only walk-up guest orders (never expose registered customer orders)
    allOrders = allOrders.filter((o) => o.customerId === 'guest-user');
  }

  res.json({
    orders: allOrders,
    count: allOrders.length,
  });
});

// 8. ESP32 Device Endpoints (Authenticated with X-Device-Token)

function verifyDeviceAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers['x-device-token'] || req.headers['x-device-secret']) as string;
  const isSimulated = req.headers['x-simulator'] === 'true';

  // Browser-based simulator is authorized when DEMO_MODE is true
  if (isSimulated && DEMO_MODE) {
    return next();
  }

  // Physical ESP32 hardware authentication (strictly matches configured DEVICE_AUTH_SECRET)
  if (!token || token !== DEVICE_AUTH_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Device Authentication Secret' });
  }
  next();
}

// Device Status & Health
app.get('/api/devices/:deviceId/status', (req, res) => {
  if (req.params.deviceId !== machine.machineId) {
    return res.status(404).json({ error: 'Unknown machine ID' });
  }

  // Check if device is offline (no heartbeat in 45 seconds)
  const lastHeartbeatTime = new Date(machine.lastHeartbeat).getTime();
  const isOffline = Date.now() - lastHeartbeatTime > 45000 && machine.status !== 'EMERGENCY_STOP';

  res.json({
    machine: {
      ...machine,
      status: isOffline ? 'OFFLINE' : machine.status,
    },
    activeJobsCount: Array.from(dispensingJobs.values()).filter((j) => j.status === 'PENDING' || j.status === 'DISPENSING').length,
  });
});

// Device Heartbeat (ESP32 calls this every 10 seconds)
app.post('/api/devices/:deviceId/heartbeat', verifyDeviceAuth, (req, res) => {
  const { status, temperatureCelsius, currentStockLiters, ipAddress, firmwareVersion } = req.body;

  machine.lastHeartbeat = new Date().toISOString();
  if (status && machine.status !== 'EMERGENCY_STOP') {
    machine.status = status;
  }
  if (typeof temperatureCelsius === 'number') machine.temperatureCelsius = temperatureCelsius;
  if (typeof currentStockLiters === 'number') machine.currentStockLiters = currentStockLiters;
  if (ipAddress) machine.ipAddress = ipAddress;
  if (firmwareVersion) machine.firmwareVersion = firmwareVersion;

  res.json({
    acknowledged: true,
    serverTime: new Date().toISOString(),
    emergencyStop: machine.status === 'EMERGENCY_STOP',
    currentStockLiters: machine.currentStockLiters,
  });
});

// ESP32 Polls and Claims Pending Dispensing Job
app.post('/api/devices/:deviceId/dispensing/claim', verifyDeviceAuth, (req, res) => {
  if (machine.status === 'EMERGENCY_STOP') {
    return res.status(423).json({ error: 'Machine is in EMERGENCY STOP state. Dispensing blocked.' });
  }

  // Find oldest pending job for this machine whose order is verified PAID
  const pendingJob = Array.from(dispensingJobs.values()).find((j) => {
    if (j.machineId !== req.params.deviceId || j.status !== 'PENDING') return false;
    const ord = orders.get(j.orderId);
    return Boolean(ord && ord.paymentStatus === 'PAID');
  });

  if (!pendingJob) {
    return res.json({
      hasJob: false,
      message: 'No pending dispensing jobs available.',
    });
  }

  // Mark job as CLAIMED/DISPENSING
  pendingJob.status = 'DISPENSING';
  pendingJob.claimedAt = new Date().toISOString();
  dispensingJobs.set(pendingJob.jobId, pendingJob);

  // Update order status
  const order = orders.get(pendingJob.orderId);
  if (order) {
    order.dispensingStatus = 'DISPENSING';
    order.updatedAt = new Date().toISOString();
    orders.set(order.orderId, order);
  }

  machine.status = 'DISPENSING';
  machine.currentJobId = pendingJob.jobId;

  logAudit('DISPENSING_JOB_CLAIMED_BY_ESP32', {
    deviceId: req.params.deviceId,
    jobId: pendingJob.jobId,
    orderId: pendingJob.orderId,
    quantityMl: pendingJob.quantityMl,
  });

  res.json({
    hasJob: true,
    jobId: pendingJob.jobId,
    orderId: pendingJob.orderId,
    dispensingToken: pendingJob.dispensingToken,
    quantityMl: pendingJob.quantityMl,
    targetRunTimeMs: pendingJob.targetRunTimeMs,
    targetPulses: pendingJob.targetPulses,
    relayPin: machine.relayPin,
    relayActiveLow: machine.relayActiveLow,
    flowSensorPin: machine.flowSensorPin,
    pulsesPerMl: machine.pulsesPerMl,
    maxRuntimeMs: machine.maxRuntimeMs,
  });
});

// ESP32 Streams Telemetry while dispensing
app.post('/api/devices/:deviceId/dispensing/telemetry', verifyDeviceAuth, (req, res) => {
  const { jobId, dispensingToken, dispensedMl, pulsesCounted, pumpRunning } = req.body;
  const job = dispensingJobs.get(jobId);

  if (!job || job.dispensingToken !== dispensingToken) {
    return res.status(403).json({ error: 'Unauthorized dispensing telemetry or invalid token' });
  }

  job.dispensedMl = dispensedMl || job.dispensedMl;
  job.pulsesCounted = pulsesCounted || job.pulsesCounted;
  dispensingJobs.set(jobId, job);

  const order = orders.get(job.orderId);
  if (order) {
    order.dispensedMl = job.dispensedMl;
    orders.set(order.orderId, order);
  }

  res.json({
    acknowledged: true,
    emergencyStop: machine.status === 'EMERGENCY_STOP',
    pumpCommand: machine.status === 'EMERGENCY_STOP' ? 'STOP' : pumpRunning ? 'CONTINUE' : 'IDLE',
  });
});

// ESP32 Confirms Dispensing Completion
app.post('/api/devices/:deviceId/dispensing/complete', verifyDeviceAuth, (req, res) => {
  const { jobId, dispensingToken, dispensedMl, actualRunTimeMs, pulsesCounted } = req.body;
  const job = dispensingJobs.get(jobId);

  if (!job || job.dispensingToken !== dispensingToken) {
    return res.status(403).json({ error: 'Unauthorized completion verification or invalid token' });
  }

  job.status = 'COMPLETED';
  job.completedAt = new Date().toISOString();
  job.dispensedMl = dispensedMl || job.quantityMl;
  job.pulsesCounted = pulsesCounted || job.targetPulses;
  dispensingJobs.set(jobId, job);

  // Update Order
  const order = orders.get(job.orderId);
  if (order) {
    order.dispensingStatus = 'COMPLETED';
    order.dispensedMl = job.dispensedMl;
    order.updatedAt = new Date().toISOString();
    orders.set(order.orderId, order);
  }

  // Deduct Inventory Stock using FEFO (First Expired, First Out)
  // Distinguish measured volume vs time-based estimated quantity if flow pulses = 0
  const unmeasured = !pulsesCounted || Number(pulsesCounted) === 0;
  const fefoResult = deductStockFEFO(machine.machineId, job.dispensedMl, job.orderId, false, unmeasured);
  machine.status = 'READY';
  machine.currentJobId = null;

  logAudit('DISPENSING_JOB_COMPLETED', {
    deviceId: req.params.deviceId,
    jobId,
    orderId: job.orderId,
    dispensedMl: job.dispensedMl,
    actualRunTimeMs,
    pulsesCounted: job.pulsesCounted,
    measurementType: unmeasured ? 'TIME_ESTIMATED' : 'FLOW_SENSOR_PULSES',
    stockRemainingLiters: machine.currentStockLiters,
    batchesAffected: fefoResult.batchesAffected,
  });

  res.json({
    success: true,
    message: 'Milk Dispensing Completed. Thank you for using Smart Milk ATM!',
    order,
    job,
    measurementType: unmeasured ? 'TIME_ESTIMATED' : 'FLOW_SENSOR_PULSES',
    machineStockRemainingLiters: machine.currentStockLiters,
    fefoDeduction: fefoResult,
  });
});

// ESP32 Reports Dispensing Failure (Deducts partial volume if measured)
app.post('/api/devices/:deviceId/dispensing/fail', verifyDeviceAuth, (req, res) => {
  const { jobId, dispensingToken, failureReason, dispensedMl, pulsesCounted } = req.body;
  const job = dispensingJobs.get(jobId);

  if (!job || job.dispensingToken !== dispensingToken) {
    return res.status(403).json({ error: 'Unauthorized fail report or invalid token' });
  }

  job.status = 'FAILED';
  job.failureReason = failureReason || 'Pump or flow sensor safety shutdown';
  job.dispensedMl = dispensedMl || 0;
  job.pulsesCounted = pulsesCounted || 0;
  dispensingJobs.set(jobId, job);

  const order = orders.get(job.orderId);
  if (order) {
    order.dispensingStatus = 'FAILED';
    order.failureReason = job.failureReason;
    order.dispensedMl = job.dispensedMl;
    order.updatedAt = new Date().toISOString();
    orders.set(order.orderId, order);
  }

  // If partial volume was dispensed, deduct only measured amount via FEFO
  let partialDeduction = null;
  if (job.dispensedMl > 0) {
    partialDeduction = deductStockFEFO(machine.machineId, job.dispensedMl, job.orderId, true, !job.pulsesCounted);
  }

  machine.status = 'ERROR';
  machine.currentJobId = null;

  logAudit('DISPENSING_JOB_FAILED', {
    deviceId: req.params.deviceId,
    jobId,
    orderId: job.orderId,
    failureReason: job.failureReason,
    dispensedMl: job.dispensedMl,
    partialDeduction,
  });

  res.json({
    success: true,
    message: 'Dispensing failure recorded. Customer will be credited or issued refund for un-dispensed portion.',
    order,
    partialDeduction,
    machineStockRemainingLiters: machine.currentStockLiters,
  });
});

// 9. Admin & Safety Control Endpoints
app.post('/api/admin/emergency-stop', (req, res) => {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  machine.status = 'EMERGENCY_STOP';
  logAudit('EMERGENCY_STOP_ACTIVATED', { timestamp: new Date().toISOString(), triggeredBy: authUser.email, role: authUser.role });
  res.json({
    success: true,
    message: 'EMERGENCY STOP TRIGGERED. All relays deactivated. New dispensing halted.',
    machineStatus: machine.status,
  });
});

app.post('/api/admin/reset-emergency', (req, res) => {
  const authUser = requireRole(req, res, ['admin', 'staff']);
  if (!authUser) return;

  machine.status = 'READY';
  logAudit('EMERGENCY_STOP_CLEARED', { timestamp: new Date().toISOString(), clearedBy: authUser.email });
  res.json({
    success: true,
    message: 'Machine safety cleared. Status reset to READY.',
    machineStatus: machine.status,
  });
});

app.post('/api/admin/refill-tank', (req, res) => {
  const authUser = requireRole(req, res, ['admin', 'staff']);
  if (!authUser) return;

  const { liters } = req.body;
  const addLiters = Number(liters) || 50;
  machine.currentStockLiters = Math.min(machine.tankCapacityLiters, Number((machine.currentStockLiters + addLiters).toFixed(1)));
  logAudit('MILK_TANK_REFILLED', { addedLiters: addLiters, newTotal: machine.currentStockLiters, by: authUser.email });
  res.json({
    success: true,
    currentStockLiters: machine.currentStockLiters,
    tankCapacityLiters: machine.tankCapacityLiters,
  });
});

// Update Machine Kiosk Location (Admin-Only, persists in server & audit logs)
app.post('/api/admin/location', (req, res) => {
  const authUser = requireRole(req, res, ['admin']);
  if (!authUser) return;

  const { name, location, latitude, longitude } = req.body;

  if (name && typeof name === 'string' && name.trim().length > 0) {
    machine.name = name.trim();
  }
  if (location && typeof location === 'string' && location.trim().length > 0) {
    machine.location = location.trim();
  }

  if (latitude !== undefined) {
    if (latitude === null || latitude === '' || isNaN(Number(latitude))) {
      machine.latitude = null;
    } else {
      machine.latitude = Number(Number(latitude).toFixed(6));
    }
  }

  if (longitude !== undefined) {
    if (longitude === null || longitude === '' || isNaN(Number(longitude))) {
      machine.longitude = null;
    } else {
      machine.longitude = Number(Number(longitude).toFixed(6));
    }
  }

  machine.locationUpdatedAt = new Date().toISOString();

  logAudit('MACHINE_LOCATION_UPDATED', {
    machineId: machine.machineId,
    name: machine.name,
    location: machine.location,
    latitude: machine.latitude,
    longitude: machine.longitude,
    updatedAt: machine.locationUpdatedAt,
    updatedBy: authUser.email,
  });

  res.json({
    success: true,
    message: 'Kiosk location and GPS coordinates updated successfully.',
    machine,
  });
});

// -------------------------------------------------------------
// Milk Inventory & Stock Management Endpoints
// -------------------------------------------------------------

// Inventory Summary & Status (Staff or Admin)
app.get('/api/inventory/summary', (req, res) => {
  const authUser = requireRole(req, res, ['admin', 'staff']);
  if (!authUser) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentStockLiters = getAvailableMilkStockLitres(machine.machineId);
  machine.currentStockLiters = currentStockLiters;

  const isLowStock = currentStockLiters <= machine.minStockThresholdLiters;

  // Calculate today's received and dispensed totals from transactions
  const todayTx = stockTransactions.filter((tx) => tx.timestamp.startsWith(todayStr));
  const totalReceivedTodayLitres = todayTx
    .filter((tx) => tx.type === 'REFILL')
    .reduce((sum, tx) => sum + tx.litres, 0);
  const totalDispensedTodayLitres = Math.abs(
    todayTx
      .filter((tx) => tx.type === 'DISPENSE' || tx.type === 'PARTIAL_DISPENSE')
      .reduce((sum, tx) => sum + tx.litres, 0)
  );

  // Active and expiring batches
  const batches = Array.from(milkBatches.values()).sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  );
  const activeBatchesCount = batches.filter((b) => b.status === 'ACTIVE' && b.remainingLitres > 0).length;

  const twoDaysAhead = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
  const expiringSoonBatchesCount = batches.filter(
    (b) => b.status === 'ACTIVE' && b.remainingLitres > 0 && b.expiryDate <= twoDaysAhead
  ).length;

  const refills = Array.from(stockRefills.values()).sort(
    (a, b) => new Date(b.refillTimestamp).getTime() - new Date(a.refillTimestamp).getTime()
  );

  res.json({
    summary: {
      machineId: machine.machineId,
      tankCapacityLiters: machine.tankCapacityLiters,
      currentStockLiters,
      minStockThresholdLiters: machine.minStockThresholdLiters,
      isLowStock,
      totalReceivedTodayLitres: Number(totalReceivedTodayLitres.toFixed(2)),
      totalDispensedTodayLitres: Number(totalDispensedTodayLitres.toFixed(2)),
      activeBatchesCount,
      expiringSoonBatchesCount,
      temperatureCelsius: machine.temperatureCelsius,
      temperatureSensorConnected: machine.temperatureSensorConnected,
      lastRefillTimestamp: refills[0]?.refillTimestamp || null,
    },
    machine,
    batches,
    refills: refills.slice(0, 30),
    transactions: stockTransactions.slice(0, 30),
  });
});

// Milk Stock Refill (Staff or Admin, with automatic authenticated staff receiving identity)
app.post('/api/inventory/refill', (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required to register milk refill' });
  }

  if (authUser.role !== 'staff' && authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Only authenticated Staff or Administrators can record milk refills' });
  }

  const { supplierName, quantityLitres, batchNumber, expiryDate, temperatureCelsius, notes } = req.body;

  const qty = Number(quantityLitres);
  if (!qty || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number of Litres' });
  }

  if (!supplierName || typeof supplierName !== 'string' || supplierName.trim().length < 2) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  if (!expiryDate || typeof expiryDate !== 'string') {
    return res.status(400).json({ error: 'Valid batch expiry date (YYYY-MM-DD) is required' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (expiryDate < todayStr) {
    return res.status(400).json({ error: 'Cannot accept milk batch that is already expired!' });
  }

  // Automatic receiving staff from session
  const staffId = authUser.staffId || (authUser.role === 'admin' ? 'ADM-OFFICER' : 'STF-STAFF');
  const staffName = authUser.fullName;

  // Capacity check
  const currentAvailable = getAvailableMilkStockLitres(machine.machineId);
  if (currentAvailable + qty > machine.tankCapacityLiters) {
    return res.status(400).json({
      error: `Refill of ${qty} L would exceed tank capacity (${machine.tankCapacityLiters} L). Available space: ${(machine.tankCapacityLiters - currentAvailable).toFixed(1)} L.`,
    });
  }

  const generatedBatchNumber = batchNumber?.trim() || `BATCH-${Date.now().toString().slice(-6)}`;
  const batchId = generatedBatchNumber;

  const newBatch: MilkBatchRecord = {
    batchId,
    batchNumber: generatedBatchNumber,
    machineId: machine.machineId,
    supplierName: supplierName.trim(),
    receivedLitres: qty,
    remainingLitres: qty,
    expiryDate: expiryDate.trim(),
    storageTemperatureCelsius: typeof temperatureCelsius === 'number' ? temperatureCelsius : machine.temperatureCelsius,
    receivedAt: new Date().toISOString(),
    receivedByStaffId: staffId,
    receivedByStaffName: staffName,
    status: 'ACTIVE',
    notes: notes?.trim() || 'Standard dairy cold-chain intake',
  };

  milkBatches.set(batchId, newBatch);

  // Immutable Refill Log
  const refillId = `RFL-${Date.now().toString().slice(-7)}`;
  const refillRecord: StockRefillRecord = {
    refillId,
    machineId: machine.machineId,
    batchNumber: generatedBatchNumber,
    supplierName: newBatch.supplierName,
    quantityLitres: qty,
    expiryDate: newBatch.expiryDate,
    temperatureCelsius: newBatch.storageTemperatureCelsius,
    staffId,
    staffName,
    refillTimestamp: newBatch.receivedAt,
    immutable: true,
    notes: newBatch.notes,
  };
  stockRefills.set(refillId, refillRecord);

  // Stock Transaction
  const newBalance = Number((currentAvailable + qty).toFixed(2));
  machine.currentStockLiters = newBalance;

  stockTransactions.unshift({
    transactionId: `TX-RFL-${refillId}`,
    machineId: machine.machineId,
    type: 'REFILL',
    litres: qty,
    batchId,
    batchNumber: generatedBatchNumber,
    balanceAfterLitres: newBalance,
    timestamp: newBatch.receivedAt,
    performedBy: `${staffName} (${staffId})`,
    notes: `Refill from ${newBatch.supplierName}`,
  });

  logAudit('MILK_STOCK_REFILLED', {
    refillId,
    batchNumber: generatedBatchNumber,
    quantityLitres: qty,
    newBalance,
    staffId,
    staffName,
    supplierName: newBatch.supplierName,
  });

  res.json({
    success: true,
    message: `Successfully received ${qty} Litres into milk inventory.`,
    batch: newBatch,
    refill: refillRecord,
    currentStockLiters: machine.currentStockLiters,
  });
});

// Configure Low Stock Threshold (Admin only)
app.post('/api/inventory/threshold', (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can update the low-stock threshold' });
  }

  const { minStockThresholdLiters } = req.body;
  const threshold = Number(minStockThresholdLiters);
  if (isNaN(threshold) || threshold < 1 || threshold > 50) {
    return res.status(400).json({ error: 'Threshold must be between 1 and 50 Litres' });
  }

  machine.minStockThresholdLiters = threshold;
  logAudit('LOW_STOCK_THRESHOLD_UPDATED', { minStockThresholdLiters: threshold, updatedBy: authUser.email });

  res.json({
    success: true,
    minStockThresholdLiters: machine.minStockThresholdLiters,
  });
});

// Export Inventory Data as CSV (Staff or Admin)
app.get('/api/inventory/export', (req, res) => {
  const authUser = requireRole(req, res, ['admin', 'staff']);
  if (!authUser) return;

  const batches = Array.from(milkBatches.values());
  const refills = Array.from(stockRefills.values());

  let csv = '=== SMART MILK ATM - MILK INVENTORY REPORT ===\n';
  csv += `Generated: ${new Date().toISOString()}\n`;
  csv += `Machine ID: ${machine.machineId}\n`;
  csv += `Current Stock: ${machine.currentStockLiters} Litres\n\n`;

  csv += '--- BATCHES (FEFO ORDER) ---\n';
  csv += 'Batch Number,Supplier,Received (L),Remaining (L),Expiry Date,Temp (°C),Receiving Staff,Status\n';
  for (const b of batches) {
    csv += `"${b.batchNumber}","${b.supplierName}",${b.receivedLitres},${b.remainingLitres},"${b.expiryDate}",${b.storageTemperatureCelsius ?? 'N/A'},"${b.receivedByStaffName}","${b.status}"\n`;
  }

  csv += '\n--- REFILL AUDIT LOGS ---\n';
  csv += 'Refill ID,Batch Number,Supplier,Quantity (L),Expiry Date,Refill Timestamp,Receiving Staff\n';
  for (const r of refills) {
    csv += `"${r.refillId}","${r.batchNumber}","${r.supplierName}",${r.quantityLitres},"${r.expiryDate}","${r.refillTimestamp}","${r.staffName}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="milk_inventory_report.csv"');
  res.send(csv);
});

// -------------------------------------------------------------
// Staff Management Endpoints (Admin Only)
// -------------------------------------------------------------

// List all Staff Members
app.get('/api/admin/staff', (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }

  const staffUsers = Array.from(users.values())
    .filter((u) => u.role === 'staff')
    .map(sanitizeUser);

  res.json({
    success: true,
    staff: staffUsers,
  });
});

// Approve, Reject, Suspend, or Reactivate Staff
app.post('/api/admin/staff/action', (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }

  const { uid, action, assignedMachineId } = req.body;
  const targetUser = users.get(uid);

  if (!targetUser || targetUser.role !== 'staff') {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  if (action === 'APPROVE') {
    targetUser.approvalStatus = 'APPROVED';
    targetUser.approvedBy = authUser.uid;
    targetUser.approvedAt = new Date().toISOString();
    if (assignedMachineId) targetUser.assignedMachineId = assignedMachineId;
  } else if (action === 'REJECT') {
    targetUser.approvalStatus = 'REJECTED';
  } else if (action === 'SUSPEND') {
    targetUser.approvalStatus = 'SUSPENDED';
  } else if (action === 'REACTIVATE') {
    targetUser.approvalStatus = 'APPROVED';
  } else {
    return res.status(400).json({ error: 'Invalid action. Must be APPROVE, REJECT, SUSPEND, or REACTIVATE.' });
  }

  users.set(uid, targetUser);

  logAudit('STAFF_STATUS_UPDATED', {
    targetUid: uid,
    staffId: targetUser.staffId,
    newStatus: targetUser.approvalStatus,
    updatedBy: authUser.email,
  });

  res.json({
    success: true,
    message: `Staff account status changed to ${targetUser.approvalStatus}`,
    staff: sanitizeUser(targetUser),
  });
});

// Generate Administrator Invite Token
app.post('/api/admin/invites/generate', (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can generate invite tokens' });
  }

  const token = `INV-ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  adminInviteTokens.add(token);

  logAudit('ADMIN_INVITE_TOKEN_GENERATED', { token, createdBy: authUser.email });

  res.json({
    success: true,
    inviteToken: token,
    expiresIn: '24 hours',
  });
});

// Staff Technical Problem Report
app.post('/api/staff/report-problem', (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || (authUser.role !== 'staff' && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Staff or administrator credentials required' });
  }

  const { problemType, description, severity } = req.body;
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Problem description is required' });
  }

  logAudit('STAFF_PROBLEM_REPORTED', {
    staffId: authUser.staffId,
    staffName: authUser.fullName,
    problemType: problemType || 'HARDWARE_ANOMALY',
    severity: severity || 'MEDIUM',
    description: description.trim(),
    timestamp: new Date().toISOString(),
  });

  if (severity === 'CRITICAL') {
    machine.status = 'ERROR';
  }

  res.json({
    success: true,
    message: 'Problem report logged and dispatched to maintenance audit log.',
  });
});

// Admin Stats & Audit Logs (Admin Only)
app.get('/api/admin/stats', (req, res) => {
  const authUser = requireRole(req, res, ['admin']);
  if (!authUser) return;

  const allOrders = Array.from(orders.values());
  const totalRevenuePaise = allOrders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.amountPaise, 0);

  const completedDispenses = allOrders.filter((o) => o.dispensingStatus === 'COMPLETED').length;
  const failedDispenses = allOrders.filter((o) => o.dispensingStatus === 'FAILED').length;
  const pendingDispenses = allOrders.filter((o) => o.dispensingStatus === 'PENDING_DISPENSE').length;
  const pendingOrders = allOrders.filter((o) => o.paymentStatus === 'PENDING').length;
  const paidOrders = allOrders.filter((o) => o.paymentStatus === 'PAID').length;
  const failedPayments = allOrders.filter((o) => o.paymentStatus === 'FAILED').length;

  res.json({
    totalOrders: allOrders.length,
    totalTestOrders: allOrders.length,
    paidOrders,
    capturedPayments: paidOrders,
    pendingOrders,
    pendingPayments: pendingOrders,
    failedPayments,
    simulatedPaidOrders: allOrders.filter((o) => o.paymentStatus === 'PAID' && o.isSimulatedPayment !== false).length,
    gatewayCapturedOrders: allOrders.filter((o) => o.paymentStatus === 'PAID' && o.isSimulatedPayment === false).length,
    completedDispenses,
    failedDispenses,
    pendingDispenses,
    totalRevenueInr: totalRevenuePaise / 100,
    demoMode: DEMO_MODE,
    merchantUpiId: MERCHANT_UPI_ID,
    isRazorpayConfigured,
    razorpayMode: DEMO_MODE && razorpayMode === 'LIVE' ? 'TEST' : razorpayMode,
    razorpayLiveDisabled: DEMO_MODE || razorpayMode !== 'LIVE',
    razorpayKeyId: !DEMO_MODE && isRazorpayConfigured ? RAZORPAY_KEY_ID : null,
    webhookConfigured: isWebhookSecretConfigured,
    liveModeReady,
    firebaseMode: FIREBASE_MODE,
    firebaseProjectId: FIREBASE_PROJECT_ID,
    firebaseDatabaseId: FIREBASE_DATABASE_ID,
    adminSdkAvailable: ADMIN_SDK_AVAILABLE,
    readinessChecks: {
      keyIdConfigured: isValidRazorpayKey(RAZORPAY_KEY_ID),
      keySecretConfigured: isValidRazorpaySecret(RAZORPAY_KEY_SECRET),
      isLiveKey: Boolean(RAZORPAY_KEY_ID?.startsWith('rzp_live_')),
      webhookSecretConfigured: isWebhookSecretConfigured,
      demoModeDisabled: !DEMO_MODE,
      httpsBaseUrl: isHttpsAppBaseUrl,
      customDeviceSecretConfigured: isCustomDeviceSecretConfigured,
    },
    appBaseUrl: APP_BASE_URL,
    machine,
    auditLogs: auditLogs.slice(0, 30),
    plasticPouchesPrevented: completedDispenses * 1.25, // average pouch calculation
  });
});

// 10. In-Browser ESP32 Hardware Simulator (Strictly blocked in Live Mode & for unpaid orders)
app.post('/api/simulator/simulate-step', (req, res) => {
  if (!DEMO_MODE) {
    return res.status(403).json({ error: 'Hardware simulator is disabled when DEMO_MODE=false. Real ESP32 device polling required.' });
  }

  const { orderId } = req.body;
  const order = orders.get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.paymentStatus !== 'PAID') {
    return res.status(403).json({ error: 'Dispensing forbidden: Payment has not been verified and captured.' });
  }

  const job = dispensingJobs.get(`JOB-${order.orderId}`);
  if (!job) return res.status(404).json({ error: 'No dispensing job found for order' });

  // Advance simulation
  if (job.status === 'PENDING') {
    job.status = 'DISPENSING';
    order.dispensingStatus = 'DISPENSING';
    job.dispensedMl = Math.round(order.quantityMl * 0.35);
  } else if (job.status === 'DISPENSING') {
    job.dispensedMl = Math.min(order.quantityMl, job.dispensedMl + Math.round(order.quantityMl * 0.35));
    if (job.dispensedMl >= order.quantityMl) {
      job.status = 'COMPLETED';
      order.dispensingStatus = 'COMPLETED';
      // Use FEFO Stock Deduction
      deductStockFEFO(machine.machineId, order.quantityMl, order.orderId, false);
    }
  }

  order.dispensedMl = job.dispensedMl;
  order.updatedAt = new Date().toISOString();
  orders.set(order.orderId, order);
  dispensingJobs.set(job.jobId, job);

  res.json({ success: true, order, job, machine });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving Setup
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.all('/api/*', (_req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Milk ATM Backend Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Demo Mode: ${DEMO_MODE ? 'ENABLED (Simulation Allowed)' : 'DISABLED (Real Gateway & Hardware Required)'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
