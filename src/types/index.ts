export type UserRole = 'customer' | 'staff' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  bottlesSaved: number;
  totalMilkPurchasedMl: number;
  createdAt?: string;
  // Staff-specific attributes
  staffId?: string;
  assignedMachineId?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  approvedBy?: string;
  approvedAt?: string;
  authProvider?: string;
}

export interface MilkTier {
  id: string;
  quantityMl: number;
  label: string;
  priceInr: number;
  pricePaise: number;
  defaultRunTimeMs: number;
  estimatedPulses: number;
}

export interface Order {
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

export interface MachineInfo {
  machineId: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt?: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'READY' | 'DISPENSING' | 'ERROR' | 'EMERGENCY_STOP';
  currentJobId?: string | null;
  tankCapacityLiters: number;
  currentStockLiters: number;
  temperatureCelsius: number | null; // null if sensor not connected
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

export interface MilkBatch {
  batchId: string;
  batchNumber: string; // e.g., 'BATCH-20261101-01'
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

export interface StockRefill {
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

export interface StockTransaction {
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

export interface InventorySummary {
  machineId: string;
  tankCapacityLiters: number;
  currentStockLiters: number;
  minStockThresholdLiters: number;
  isLowStock: boolean;
  totalReceivedTodayLitres: number;
  totalDispensedTodayLitres: number;
  activeBatchesCount: number;
  expiringSoonBatchesCount: number;
  temperatureCelsius: number | null;
  temperatureSensorConnected: boolean;
  lastRefillTimestamp?: string;
}

export interface SystemConfig {
  appName: string;
  tagline: string;
  environmentalMessage: string;
  demoMode: boolean;
  razorpayKeyId: string | null;
  razorpayConfigured: boolean;
  razorpayMode?: 'LIVE' | 'TEST' | 'UNCONFIGURED';
  razorpayLiveDisabled?: boolean;
  merchantUpiId?: string;
  webhookConfigured?: boolean;
  liveModeReady?: boolean;
  defaultMachineId: string;
  currency: string;
  serverTime: string;
  firebaseMode?: string;
  firebaseProjectId?: string;
  firebaseDatabaseId?: string;
  adminSdkAvailable?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  details: any;
}
