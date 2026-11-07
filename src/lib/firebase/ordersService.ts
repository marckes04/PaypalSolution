import { PurchaseOrderDoc, OrderStatus } from '@/types/order';

declare global {
  // eslint-disable-next-line no-var
  var __payagent_orders_store__: PurchaseOrderDoc[] | undefined;
}

// Initial seed data to ensure the dashboard ledger is populated during demo presentations
const INITIAL_DEMO_ORDERS: PurchaseOrderDoc[] = [
  {
    id: 'po_1794009581',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    department: 'Engineering',
    totalAmount: 900.0,
    status: 'APPROVED',
    paypalOrderId: '6PV338339R1938839',
  },
  {
    id: 'po_1794009320',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    department: 'Engineering',
    totalAmount: 400.0,
    status: 'APPROVED',
  },
  {
    id: 'po_1794009110',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    department: 'Engineering',
    totalAmount: 120.0,
    status: 'APPROVED',
  },
  {
    id: 'po_1794008900',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    department: 'Engineering',
    totalAmount: 12000.0,
    status: 'PENDING',
    paypalOrderId: '78B099547L735113U',
    approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=78B099547L735113U',
  },
];

function getStore(): PurchaseOrderDoc[] {
  if (!global.__payagent_orders_store__) {
    global.__payagent_orders_store__ = [...INITIAL_DEMO_ORDERS];
  }
  return global.__payagent_orders_store__;
}

export async function savePurchaseOrder(
  orderData: Omit<PurchaseOrderDoc, 'id'>
): Promise<string> {
  const store = getStore();
  const generatedId = `po_${Date.now()}`;
  const timestamp = orderData.createdAt || new Date().toISOString();

  const newOrder: PurchaseOrderDoc = {
    id: generatedId,
    ...orderData,
    createdAt: timestamp,
  };

  store.unshift(newOrder);

  // Optional background sync to Firestore (fails silently without breaking the ledger)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/purchase_orders`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: generatedId },
          department: { stringValue: orderData.department || 'Engineering' },
          totalAmount: { doubleValue: Number(orderData.totalAmount) || 0 },
          status: { stringValue: orderData.status || 'PENDING' },
          createdAt: { stringValue: timestamp },
          ...(orderData.paypalOrderId ? { paypalOrderId: { stringValue: orderData.paypalOrderId } } : {}),
          ...(orderData.approvalUrl ? { approvalUrl: { stringValue: orderData.approvalUrl } } : {}),
        },
      }),
    }).catch(() => {});
  }

  return generatedId;
}

export async function updateOrderStatus(
  identifier: string,
  status: OrderStatus = 'APPROVED'
): Promise<boolean> {
  const store = getStore();

  const order = store.find(
    (o) =>
      o.id === identifier ||
      o.paypalOrderId === identifier ||
      (o.approvalUrl && o.approvalUrl.includes(identifier))
  );

  if (order) {
    order.status = status;
    return true;
  }

  return false;
}

export async function getPurchaseOrders(): Promise<PurchaseOrderDoc[]> {
  const store = getStore();
  return [...store].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}