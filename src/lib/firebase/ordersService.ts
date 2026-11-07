import { PurchaseOrderDoc, OrderStatus } from '@/types/order';

declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_ORDERS__: PurchaseOrderDoc[] | undefined;
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'solution-345c8';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/orders`;

// Datos semilla para que nunca esté vacía la tabla
const SEED_ORDERS: PurchaseOrderDoc[] = [
  {
    id: 'po_demo_01',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    department: 'Engineering',
    totalAmount: 120.0,
    status: 'APPROVED',
  },
  {
    id: 'po_demo_02',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    department: 'Engineering',
    totalAmount: 850.0,
    status: 'PENDING',
    paypalOrderId: '78B099547L735113U',
    approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=78B099547L735113U',
  },
];

function getMemoryStore(): PurchaseOrderDoc[] {
  if (!global.__GLOBAL_ORDERS__) {
    global.__GLOBAL_ORDERS__ = [...SEED_ORDERS];
  }
  return global.__GLOBAL_ORDERS__;
}

export async function savePurchaseOrder(orderData: any): Promise<string> {
  const store = getMemoryStore();
  const id = orderData.id || `po_${Date.now()}`;
  const record: PurchaseOrderDoc = {
    ...orderData,
    id,
    createdAt: orderData.createdAt || new Date().toISOString(),
  };

  // 1. Guardar en memoria inmediatamente
  const existingIndex = store.findIndex((o) => o.id === id);
  if (existingIndex >= 0) {
    store[existingIndex] = record;
  } else {
    store.unshift(record);
  }

  // 2. Intentar guardar en Firestore en segundo plano
  try {
    fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: id },
          department: { stringValue: String(record.department || 'Engineering') },
          totalAmount: { doubleValue: Number(record.totalAmount) || 0 },
          status: { stringValue: String(record.status || 'PENDING') },
          createdAt: { stringValue: record.createdAt },
          ...(record.paypalOrderId ? { paypalOrderId: { stringValue: record.paypalOrderId } } : {}),
          ...(record.approvalUrl ? { approvalUrl: { stringValue: record.approvalUrl } } : {}),
        },
      }),
    }).catch(() => {});
  } catch {
    // Si Firestore falla, la orden ya vive en memoria
  }

  return id;
}

export async function updateOrderStatus(
  identifier: string,
  status: OrderStatus = 'APPROVED'
): Promise<boolean> {
  const store = getMemoryStore();
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
  const store = getMemoryStore();

  // Intentar consultar Firestore
  try {
    const res = await fetch(`${BASE_URL}?pageSize=100`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
        for (const doc of data.documents) {
          const docId = doc.name ? doc.name.split('/').pop() : '';
          const fields = doc.fields || {};
          const po: PurchaseOrderDoc = {
            id: docId,
            createdAt: fields.createdAt?.stringValue || new Date().toISOString(),
            department: fields.department?.stringValue || 'Engineering',
            totalAmount: Number(fields.totalAmount?.doubleValue || fields.totalAmount?.integerValue || 0),
            status: (fields.status?.stringValue as OrderStatus) || 'APPROVED',
            paypalOrderId: fields.paypalOrderId?.stringValue,
            approvalUrl: fields.approvalUrl?.stringValue,
          };
          if (!store.some((s) => s.id === po.id)) {
            store.push(po);
          }
        }
      }
    }
  } catch {
    // Si falla la red de Firestore, devolvemos el almacén local
  }

  return [...store].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}