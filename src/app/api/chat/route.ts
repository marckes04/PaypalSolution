import { savePurchaseOrder } from '@/lib/firebase/ordersService';

// Inside your POST handler where the order is evaluated:
const orderPayload = {
  department: department || 'Engineering',
  items: parsedItems,
  totalAmount: calculatedTotal,
  status: calculatedTotal < 500 ? 'APPROVED' : 'PENDING_APPROVAL',
  paypalOrderId: paypalOrder?.id || null,
  approvalUrl: approvalUrl || null,
  createdAt: new Date().toISOString(),
  auditLog: [
    `Requisition processed on ${new Date().toISOString()} - Total: $${calculatedTotal}`,
  ],
};

// CRITICAL: Call the persistent storage service
const savedOrderId = await savePurchaseOrder(orderPayload);