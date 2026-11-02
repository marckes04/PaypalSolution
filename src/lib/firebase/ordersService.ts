import { PurchaseOrderDoc, OrderStatus } from '@/types/order';
import { persistNewOrder, persistStatusUpdate, getAllOrders } from './ordersStorage';

export async function savePurchaseOrder(orderData: Omit<PurchaseOrderDoc, 'id'>): Promise<string> {
  return await persistNewOrder(orderData);
}

export async function updateOrderStatus(id: string, status: OrderStatus, paypalOrderId?: string): Promise<void> {
  await persistStatusUpdate(id, status, paypalOrderId);
}

export function getPurchaseOrders(): PurchaseOrderDoc[] {
  return getAllOrders();
}