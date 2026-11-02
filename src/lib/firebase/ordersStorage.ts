import fs from 'fs';
import path from 'path';
import { PurchaseOrderDoc, OrderStatus } from '@/types/order';

const LOCAL_STORAGE_FILE = path.resolve(process.cwd(), '.payagent_orders.json');

function readFromDisk(): PurchaseOrderDoc[] {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[STORAGE] Error reading local orders file:', error);
  }
  return [];
}

function writeToDisk(orders: PurchaseOrderDoc[]): void {
  try {
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    console.log(`[STORAGE] Persisted ${orders.length} orders to disk at: ${LOCAL_STORAGE_FILE}`);
  } catch (error) {
    console.error('[STORAGE] Critical error writing orders to disk:', error);
  }
}

// Global in-memory cache synchronized with disk
let inMemoryOrders: PurchaseOrderDoc[] = readFromDisk();
(global as any).__PAYAGENT_ORDERS__ = inMemoryOrders;

export async function persistNewOrder(orderData: Omit<PurchaseOrderDoc, 'id'>): Promise<string> {
  const newId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: PurchaseOrderDoc = { id: newId, ...orderData };

  const current = readFromDisk();
  current.unshift(record);

  writeToDisk(current);
  (global as any).__PAYAGENT_ORDERS__ = current;

  return newId;
}

export async function persistStatusUpdate(id: string, newStatus: OrderStatus, paypalOrderId?: string): Promise<void> {
  const current = readFromDisk();
  const target = current.find((o) => o.id === id || (paypalOrderId && o.paypalOrderId === paypalOrderId));

  if (target) {
    target.status = newStatus;
    if (paypalOrderId) {
      target.paypalOrderId = paypalOrderId;
    }
    writeToDisk(current);
    (global as any).__PAYAGENT_ORDERS__ = current;
    console.log(`[STORAGE] Updated order ${id} to ${newStatus}`);
  }
}

export function getAllOrders(): PurchaseOrderDoc[] {
  const current = readFromDisk();
  (global as any).__PAYAGENT_ORDERS__ = current;
  return current;
}