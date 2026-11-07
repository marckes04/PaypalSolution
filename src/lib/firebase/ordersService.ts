import { PurchaseOrderDoc, OrderStatus } from '@/types/order';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'solution-345c8';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/purchase_orders`;

function toFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value)
        ? { integerValue: value.toString() }
        : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) =>
            typeof v === 'object' ? { mapValue: { fields: toFirestoreFields(v) } } : { stringValue: String(v) }
          ),
        },
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
    }
  }
  return fields;
}

function fromFirestoreFields(fields: any): any {
  const result: any = {};
  if (!fields) return result;
  for (const [key, valObj] of Object.entries(fields)) {
    const val = valObj as any;
    if ('stringValue' in val) result[key] = val.stringValue;
    else if ('integerValue' in val) result[key] = parseInt(val.integerValue, 10);
    else if ('doubleValue' in val) result[key] = parseFloat(val.doubleValue);
    else if ('booleanValue' in val) result[key] = val.booleanValue;
    else if ('arrayValue' in val) {
      result[key] = (val.arrayValue.values || []).map((item: any) =>
        item.mapValue ? fromFirestoreFields(item.mapValue.fields) : Object.values(item)[0]
      );
    } else if ('mapValue' in val) {
      result[key] = fromFirestoreFields(val.mapValue.fields);
    }
  }
  return result;
}

export async function savePurchaseOrder(orderData: Omit<PurchaseOrderDoc, 'id'>): Promise<string> {
  const timestamp = orderData.createdAt || new Date().toISOString();
  const payload = {
    fields: toFirestoreFields({
      ...orderData,
      createdAt: timestamp,
    }),
  };

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[FIRESTORE_REST_SAVE_ERROR]', errText);
      throw new Error(`Firestore save failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.name ? data.name.split('/').pop() : `PO-${Date.now()}`;
  } catch (err) {
    console.error('[SAVE_ORDER_EXCEPTION]', err);
    throw err;
  }
}

export async function updateOrderStatus(
  identifier: string,
  status: OrderStatus = 'APPROVED'
): Promise<boolean> {
  try {
    console.log(`[UPDATE_ATTEMPT] Looking for order matching token/id: "${identifier}"`);

    // 1. Fetch current purchase orders
    const res = await fetch(`${BASE_URL}?pageSize=100`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      console.error('[FIRESTORE_GET_FAIL]', res.status, await res.text());
      return false;
    }

    const data = await res.json();
    const documents = data.documents || [];

    // Match by document ID or paypalOrderId or approvalUrl containing token
    const targetDoc = documents.find((doc: any) => {
      const docId = doc.name ? doc.name.split('/').pop() : '';
      const orderToken = doc.fields?.paypalOrderId?.stringValue;
      const approvalUrl = doc.fields?.approvalUrl?.stringValue || '';
      return docId === identifier || orderToken === identifier || approvalUrl.includes(identifier);
    });

    if (!targetDoc) {
      console.warn(`[FIRESTORE_UPDATE_WARN] No matching document for "${identifier}" across ${documents.length} docs`);
      return false;
    }

    const docId = targetDoc.name.split('/').pop();
    console.log(`[UPDATE_TARGET_FOUND] Matching doc ID: ${docId}`);

    // 2. Patch status field only using updateMask
    const patchUrl = `${BASE_URL}/${docId}?updateMask.fieldPaths=status`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          status: { stringValue: status }
        }
      }),
      cache: 'no-store',
    });

    if (!patchRes.ok) {
      const patchErr = await patchRes.text();
      console.error('[FIRESTORE_PATCH_ERROR]', patchRes.status, patchErr);
      return false;
    }

    console.log(`[FIRESTORE_UPDATE_SUCCESS] Document ${docId} successfully updated to ${status}`);
    return true;
  } catch (err) {
    console.error('[UPDATE_ORDER_EXCEPTION]', err);
    return false;
  }
}

export async function getPurchaseOrders(): Promise<PurchaseOrderDoc[]> {
  try {
    const res = await fetch(`${BASE_URL}?pageSize=100`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      console.warn('[FIRESTORE_REST_GET_WARN]', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) {
      return [];
    }

    const orders: PurchaseOrderDoc[] = data.documents.map((doc: any) => {
      const id = doc.name ? doc.name.split('/').pop() : '';
      const fields = fromFirestoreFields(doc.fields);
      return {
        id,
        ...fields,
      } as PurchaseOrderDoc;
    });

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return orders;
  } catch (err) {
    console.error('[GET_ORDERS_EXCEPTION]', err);
    return [];
  }
}