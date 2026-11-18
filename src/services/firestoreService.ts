import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  UserProfile,
  Order,
  MachineInfo,
  MilkBatch,
  StockRefill,
  StockTransaction,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isFirebaseSessionReady(): boolean {
  return Boolean(auth.currentUser && auth.currentUser.emailVerified);
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export async function syncUserProfileToFirestore(
  profile: UserProfile,
  authProvider: string = 'password'
): Promise<boolean> {
  if (!isFirebaseSessionReady() || !auth.currentUser) return false;
  const uid = auth.currentUser.uid;
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const payload: Record<string, any> = {
        uid,
        email: (profile.email || auth.currentUser.email || '').slice(0, 254),
        fullName: (profile.fullName || auth.currentUser.displayName || 'Customer').slice(0, 120),
        role: 'customer',
        bottlesSaved: Math.max(0, Math.round(profile.bottlesSaved || 0)),
        totalMilkPurchasedMl: Math.max(0, Math.round(profile.totalMilkPurchasedMl || 0)),
        authProvider: authProvider.slice(0, 40),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (profile.phone) payload.phone = String(profile.phone).slice(0, 32);
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, {
        fullName: (profile.fullName || existing.data().fullName || 'Customer').slice(0, 120),
        bottlesSaved: Math.max(0, Math.round(profile.bottlesSaved ?? existing.data().bottlesSaved ?? 0)),
        totalMilkPurchasedMl: Math.max(
          0,
          Math.round(profile.totalMilkPurchasedMl ?? existing.data().totalMilkPurchasedMl ?? 0)
        ),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (err) {
    console.warn('Firestore user profile sync skipped or rejected:', err);
    return false;
  }
}

export async function getUserProfileFromFirestore(uid: string): Promise<Record<string, any> | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function upsertOrderInFirestore(order: Order): Promise<boolean> {
  if (!isFirebaseSessionReady() || !auth.currentUser) return false;
  const orderId = sanitizeId(order.orderId);
  const path = `orders/${orderId}`;
  const ref = doc(db, 'orders', orderId);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      if (order.paymentStatus !== 'PENDING' || order.dispensingStatus !== 'WAITING_PAYMENT') {
        return false;
      }
      const createPayload: Record<string, any> = {
        orderId,
        customerId: auth.currentUser.uid,
        customerName: (order.customerName || 'Customer').slice(0, 120),
        customerEmail: (order.customerEmail || auth.currentUser.email || 'customer@smartmilkatm.in').slice(0, 254),
        machineId: sanitizeId(order.machineId || 'ATM-KA-001'),
        quantityMl: Math.round(order.quantityMl),
        amountPaise: Math.round(order.amountPaise),
        amountInr: Number(order.amountInr),
        currency: 'INR',
        upiId: (order.upiId || '9353944629@ibl').slice(0, 100),
        paymentStatus: order.paymentStatus,
        dispensingStatus: order.dispensingStatus,
        gatewayMode: order.gatewayMode || 'DEMO_SIMULATION',
        isSimulatedPayment: Boolean(order.isSimulatedPayment ?? true),
        paymentVerificationType: order.paymentVerificationType || 'NONE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (order.razorpayOrderId) createPayload.razorpayOrderId = order.razorpayOrderId.slice(0, 80);
      await setDoc(ref, createPayload);
      return true;
    } else {
      const prevStatus = existing.data()?.dispensingStatus;
      if (prevStatus === 'COMPLETED' || prevStatus === 'FAILED') {
        return false;
      }
      const updatePayload: Record<string, any> = {
        paymentStatus: order.paymentStatus,
        dispensingStatus: order.dispensingStatus,
        upiId: (order.upiId || existing.data()?.upiId || '9353944629@ibl').slice(0, 100),
        gatewayMode: order.gatewayMode || existing.data()?.gatewayMode || 'DEMO_SIMULATION',
        isSimulatedPayment: Boolean(order.isSimulatedPayment ?? existing.data()?.isSimulatedPayment ?? true),
        paymentVerificationType: order.paymentVerificationType || 'NONE',
        updatedAt: serverTimestamp(),
      };
      if (order.razorpayOrderId) updatePayload.razorpayOrderId = order.razorpayOrderId.slice(0, 80);
      if (order.razorpayPaymentId) updatePayload.razorpayPaymentId = order.razorpayPaymentId.slice(0, 80);
      if (order.dispensingToken) updatePayload.dispensingToken = order.dispensingToken.slice(0, 120);
      if (typeof order.dispensedMl === 'number') updatePayload.dispensedMl = Math.round(order.dispensedMl);
      if (order.failureReason) updatePayload.failureReason = order.failureReason.slice(0, 300);

      await updateDoc(ref, updatePayload);
      return true;
    }
  } catch (err) {
    console.warn('Firestore order sync skipped:', err);
    return false;
  }
}

export async function fetchUserOrdersFromFirestore(uid: string): Promise<Order[]> {
  const path = 'orders';
  try {
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt || ''),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt || ''),
      } as Order;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveMachineLocationToFirestore(machine: MachineInfo): Promise<boolean> {
  if (!isFirebaseSessionReady()) return false;
  const machineId = sanitizeId(machine.machineId || 'ATM-KA-001');
  const path = `machines/${machineId}`;
  const ref = doc(db, 'machines', machineId);

  try {
    const snap = await getDoc(ref);
    const payload: Record<string, any> = {
      machineId,
      name: (machine.name || 'Smart Milk ATM Kiosk').slice(0, 140),
      location: (machine.location || 'Bengaluru').slice(0, 300),
      latitude: machine.latitude,
      longitude: machine.longitude,
      locationUpdatedAt: new Date().toISOString(),
      status: machine.status || 'READY',
      currentJobId: machine.currentJobId ?? null,
      tankCapacityLiters: Number(machine.tankCapacityLiters || 100),
      currentStockLiters: Number(machine.currentStockLiters || 0),
      temperatureCelsius: machine.temperatureCelsius ?? null,
      temperatureSensorConnected: Boolean(machine.temperatureSensorConnected),
      minStockThresholdLiters: Number(machine.minStockThresholdLiters || 5),
      lastHeartbeat: machine.lastHeartbeat || new Date().toISOString(),
      relayActiveLow: Boolean(machine.relayActiveLow),
      relayPin: Math.round(machine.relayPin || 26),
      flowSensorPin: Math.round(machine.flowSensorPin || 27),
      pulsesPerMl: Number(machine.pulsesPerMl || 4.5),
      maxRuntimeMs: Math.round(machine.maxRuntimeMs || 25000),
      firmwareVersion: (machine.firmwareVersion || 'v2.4.1').slice(0, 64),
      ipAddress: (machine.ipAddress || '0.0.0.0').slice(0, 64),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveRefillBatchToFirestore(params: {
  batch: MilkBatch;
  refill: StockRefill;
  staffId: string;
  staffName: string;
  newStockLiters: number;
}): Promise<boolean> {
  if (!isFirebaseSessionReady() || !auth.currentUser) return false;
  const uid = auth.currentUser.uid;
  const machineId = sanitizeId(params.batch.machineId || 'ATM-KA-001');
  const batchId = sanitizeId(params.batch.batchId);
  const refillId = sanitizeId(params.refill.refillId);
  const txId = sanitizeId(`TX-RFL-${refillId}`);

  try {
    const machineSnap = await getDoc(doc(db, 'machines', machineId));
    if (!machineSnap.exists()) {
      return false;
    }

    await setDoc(doc(db, 'milk_batches', batchId), {
      batchId,
      batchNumber: params.batch.batchNumber.slice(0, 64),
      machineId,
      supplierName: params.batch.supplierName.slice(0, 140),
      receivedLitres: Number(params.batch.receivedLitres),
      remainingLitres: Number(params.batch.remainingLitres),
      expiryDate: params.batch.expiryDate.slice(0, 24),
      storageTemperatureCelsius: params.batch.storageTemperatureCelsius ?? null,
      receivedAt: serverTimestamp(),
      receivedByStaffUid: uid,
      receivedByStaffId: params.staffId.slice(0, 40),
      receivedByStaffName: params.staffName.slice(0, 120),
      status: params.batch.status,
      notes: (params.batch.notes || '').slice(0, 300),
    });

    await setDoc(doc(db, 'stock_refills', refillId), {
      refillId,
      machineId,
      batchNumber: params.refill.batchNumber.slice(0, 64),
      supplierName: params.refill.supplierName.slice(0, 140),
      quantityLitres: Number(params.refill.quantityLitres),
      expiryDate: params.refill.expiryDate.slice(0, 24),
      temperatureCelsius: params.refill.temperatureCelsius ?? null,
      staffUid: uid,
      staffId: params.staffId.slice(0, 40),
      staffName: params.staffName.slice(0, 120),
      refillTimestamp: serverTimestamp(),
      immutable: true,
      notes: (params.refill.notes || '').slice(0, 300),
    });

    const txRecord: StockTransaction & { performedByUid: string } = {
      transactionId: txId,
      machineId,
      type: 'REFILL',
      litres: Number(params.refill.quantityLitres),
      batchId,
      batchNumber: params.batch.batchNumber.slice(0, 64),
      balanceAfterLitres: Number(params.newStockLiters),
      timestamp: new Date().toISOString(),
      performedByUid: uid,
      performedBy: `${params.staffName} (${params.staffId})`.slice(0, 140),
      notes: `Refill from ${params.batch.supplierName}`.slice(0, 300),
    };

    await setDoc(doc(db, 'stock_transactions', txId), {
      ...txRecord,
      timestamp: serverTimestamp(),
    });

    await updateDoc(doc(db, 'machines', machineId), {
      currentStockLiters: Number(params.newStockLiters),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (err) {
    console.warn('Firestore refill sync skipped:', err);
    return false;
  }
}

export async function saveStaffRequestToFirestore(reqData: {
  requestId: string;
  fullName: string;
  email: string;
  phone?: string;
  staffId: string;
  assignedMachineId: string;
}): Promise<boolean> {
  if (!isFirebaseSessionReady() || !auth.currentUser) return false;
  const requestId = sanitizeId(reqData.requestId);
  const path = `staff_requests/${requestId}`;

  try {
    const payload: Record<string, any> = {
      requestId,
      applicantUid: auth.currentUser.uid,
      fullName: reqData.fullName.slice(0, 120),
      email: reqData.email.slice(0, 254),
      staffId: reqData.staffId.slice(0, 40),
      assignedMachineId: sanitizeId(reqData.assignedMachineId || 'ATM-KA-001'),
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (reqData.phone) payload.phone = reqData.phone.slice(0, 32);

    await setDoc(doc(db, 'staff_requests', requestId), payload);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function writeAuditLogToFirestore(event: string, detailsSummary: string): Promise<boolean> {
  if (!isFirebaseSessionReady() || !auth.currentUser) return false;
  const logId = sanitizeId(`log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      timestamp: serverTimestamp(),
      event: event.slice(0, 80),
      actorUid: auth.currentUser.uid,
      detailsSummary: detailsSummary.slice(0, 500),
    });
    return true;
  } catch {
    return false;
  }
}
