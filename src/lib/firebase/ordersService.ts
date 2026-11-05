import { PurchaseOrderDoc, OrderStatus } from '@/types/order';

// Registro base persistente en la instancia en ejecución
let ordersStore: PurchaseOrderDoc[] = [
  {
    id: 'PO-2026-001',
    department: 'Engineering',
    totalAmount: 120.0,
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    items: [{ description: 'Ergonomic Keyboards', quantity: 2, unitPrice: 60 }],
  },
  {
    id: 'PO-2026-002',
    department: 'Marketing',
    totalAmount: 850.0,
    status: 'PENDING_APPROVAL',
    paypalOrderId: '9XX83741KL',
    approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=9XX83741KL',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    items: [{ description: 'Display Banner Assets', quantity: 1, unitPrice: 850 }],
  },
];

export async function savePurchaseOrder(orderData: Omit<PurchaseOrderDoc, 'id'>): Promise<string> {
  const newId = `PO-${Date.now().toString().slice(-6)}`;
  const record: PurchaseOrderDoc = {
    id: newId,
    ...orderData,
    createdAt: orderData.createdAt || new Date().toISOString(),
  };
  ordersStore.unshift(record);
  return newId;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  paypalOrderId?: string
): Promise<void> {
  ordersStore = ordersStore.map((o) =>
    o.id === id ? { ...o, status, ...(paypalOrderId ? { paypalOrderId } : {}) } : o
  );
}

export async function getPurchaseOrders(): Promise<PurchaseOrderDoc[]> {
  return ordersStore;
}