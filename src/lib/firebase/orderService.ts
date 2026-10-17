import { db } from './client';
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

// 1. Save the new order created by the agent.

export async function savePurchaseOrder(order: Omit<PurchaseOrderDoc, 'id'>) {
  const colRef = collection(db, ORDERS_COLLECTION);
  const docRef = await addDoc(colRef, order);
  return docRef.id;
}

// 2.State updated after approval  o payment in Sandbox

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  paypalOrderId?: string,
  approvalLink?: string
) {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const dataToUpdate: Record<string, unknown> = { status };
  if (paypalOrderId) dataToUpdate.paypalOrderId = paypalOrderId;
  if (approvalLink) dataToUpdate.approvalLink = approvalLink;

  await updateDoc(docRef, dataToUpdate);
}

// 3. Listener in real time to feed AG Grid

export function subscribeToOrders(callback: (orders: PurchaseOrderDoc[]) => void) {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const orders: PurchaseOrderDoc[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PurchaseOrderDoc, 'id'>),
    }));
    callback(orders);
  });
}