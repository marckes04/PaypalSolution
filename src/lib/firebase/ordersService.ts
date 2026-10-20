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

export async function savePurchaseOrder(order: Omit<PurchaseOrderDoc, 'id'>): Promise<string> {
  const db = getDb();
  const colRef = collection(db, ORDERS_COLLECTION);
  const docRef = await addDoc(colRef, order);
  return docRef.id;
}

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  paypalOrderId?: string,
  approvalLink?: string
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const dataToUpdate: Record<string, unknown> = { status };
  if (paypalOrderId) dataToUpdate.paypalOrderId = paypalOrderId;
  if (approvalLink) dataToUpdate.approvalLink = approvalLink;

  await updateDoc(docRef, dataToUpdate);
}

export function subscribeToOrders(callback: (orders: PurchaseOrderDoc[]) => void) {
  const db = getDb();
  const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const orders: PurchaseOrderDoc[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PurchaseOrderDoc, 'id'>),
    }));
    callback(orders);
  });
}