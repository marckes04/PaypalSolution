import { getDb } from './client';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { PurchaseOrderDoc, OrderStatus } from '@/types/order';

const ORDERS_COLLECTION = 'purchase_orders';

// Buffer global en el proceso Node para compartir órdenes entre endpoints de API y Next.js
if (!(global as any).__PAYAGENT_ORDERS__) {
  (global as any).__PAYAGENT_ORDERS__ = [];
}

// Ledger reactivo en memoria local (lado cliente)
let memoryLedger: PurchaseOrderDoc[] = [];
let memorySubscribers: Array<(orders: PurchaseOrderDoc[]) => void> = [];

function notifyMemorySubscribers() {
  memorySubscribers.forEach((cb) => cb([...memoryLedger]));
}

export async function savePurchaseOrder(order: Omit<PurchaseOrderDoc, 'id'>): Promise<string> {
  const db = getDb();
  const generatedId = `po_${Date.now()}`;
  const fullOrder: PurchaseOrderDoc = { id: generatedId, ...order };

  // Registrar en el contenedor global de Node
  (global as any).__PAYAGENT_ORDERS__.unshift(fullOrder);

  if (!db) {
    memoryLedger.unshift(fullOrder);
    notifyMemorySubscribers();
    return generatedId;
  }

  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    const docRef = await addDoc(colRef, order);
    return docRef.id;
  } catch {
    memoryLedger.unshift(fullOrder);
    notifyMemorySubscribers();
    return generatedId;
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  paypalOrderId?: string,
  approvalLink?: string
): Promise<void> {
  // Actualizar en el registro global de Node
  const globalList: PurchaseOrderDoc[] = (global as any).__PAYAGENT_ORDERS__ || [];
  const globalTarget = globalList.find((o) => o.id === orderId);
  if (globalTarget) {
    globalTarget.status = status;
    if (paypalOrderId) globalTarget.paypalOrderId = paypalOrderId;
    if (approvalLink) globalTarget.approvalLink = approvalLink;
  }

  // Actualizar en el ledger de memoria local
  const localTarget = memoryLedger.find((o) => o.id === orderId);
  if (localTarget) {
    localTarget.status = status;
    if (paypalOrderId) localTarget.paypalOrderId = paypalOrderId;
    if (approvalLink) localTarget.approvalLink = approvalLink;
    notifyMemorySubscribers();
  }

  const db = getDb();
  if (!db) return;

  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    const updatePayload: Record<string, unknown> = { status };
    if (paypalOrderId) updatePayload.paypalOrderId = paypalOrderId;
    if (approvalLink) updatePayload.approvalLink = approvalLink;

    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('[Firestore Update Warning]:', e);
  }
}

export function subscribeToOrders(callback: (orders: PurchaseOrderDoc[]) => void) {
  memorySubscribers.push(callback);
  callback([...memoryLedger]);

  const db = getDb();
  if (!db) {
    return () => {
      memorySubscribers = memorySubscribers.filter((s) => s !== callback);
    };
  }

  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orders: PurchaseOrderDoc[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PurchaseOrderDoc, 'id'>),
        }));
        memoryLedger = orders;
        callback(orders);
      },
      () => {
        // Fallback silencioso al ledger local si las reglas de seguridad o red fallan
      }
    );

    return () => {
      unsubscribe();
      memorySubscribers = memorySubscribers.filter((s) => s !== callback);
    };
  } catch {
    return () => {
      memorySubscribers = memorySubscribers.filter((s) => s !== callback);
    };
  }
}