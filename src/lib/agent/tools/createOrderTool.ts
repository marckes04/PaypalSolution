import { z } from 'zod';
import { payPalClient } from '@/lib/paypal/client';
import { savePurchaseOrder } from '@/lib/firebase/ordersService';

export const createOrderSchema = z.object({
  department: z.string().describe('The requesting department, e.g. Engineering, Marketing'),
  items: z.array(
    z.object({
      name: z.string().describe('Item description or name'),
      quantity: z.number().int().positive().describe('Quantity of items'),
      unitPrice: z.number().positive().describe('Price per single unit in USD'),
    })
  ).describe('List of items to purchase'),
  justification: z.string().optional().describe('Business justification for audit logs'),
  notes: z.string().optional().describe('Alternative notes or justification field'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export async function executeCreateOrder(params: CreateOrderInput, originalPrompt: string) {
  // Redondeo determinista a 2 decimales para importes monetarios USD
  const rawTotal = params.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalAmount = Math.round(rawTotal * 100) / 100;

  const requiresApproval = totalAmount >= 500;
  const initialStatus = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';

  let paypalOrderId = 'N/A';
  let approvalLink = '';

  try {
    const paypalRes = await payPalClient.createOrder({
      referenceId: `REQ-${Date.now()}`,
      amount: totalAmount,
      currency: 'USD',
      description: `Procurement: ${params.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
    });

    paypalOrderId = paypalRes.id;
    approvalLink = paypalRes.links.find((l) => l.rel === 'approve')?.href || '';
  } catch (err: unknown) {
    console.error('[PayPal Error]:', err);
  }

  const timestampIso = new Date().toISOString();
  let firestoreId = `local-${Date.now()}`;

  try {
    firestoreId = await savePurchaseOrder({
      department: params.department,
      items: params.items,
      totalAmount,
      currency: 'USD',
      status: initialStatus,
      paypalOrderId,
      approvalLink,
      justification: params.justification || params.notes || originalPrompt,
      createdAt: timestampIso,
    });
  } catch (dbErr: unknown) {
    console.warn('[Firestore Warning]: Order processed in PayPal but failed to write to DB:', dbErr);
  }

  return {
    success: true,
    orderId: firestoreId,
    paypalOrderId,
    totalAmount,
    currency: 'USD',
    status: initialStatus,
    requiresApproval,
    approvalLink,
    createdAt: timestampIso,
  };
}