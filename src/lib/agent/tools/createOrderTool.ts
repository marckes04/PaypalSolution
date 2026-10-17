import { z } from 'zod';
import { payPalClient } from '@/lib/paypal/client';
import { savePurchaseOrder } from '@/lib/firebase/ordersService';

export const createOrderSchema = z.object({
  department: z.string().describe('Department submitting the procurement request (e.g., Engineering, Marketing)'),
  description: z.string().describe('General purchase order summary'),
  items: z.array(
    z.object({
      name: z.string().describe('Line item title or service name'),
      quantity: z.number().describe('Number of units'),
      unitPrice: z.number().describe('Unit price per item'),
      sku: z.string().optional().describe('Vendor SKU identifier if available'),
    })
  ).describe('Itemized breakdown of requested products or software licenses'),
  currency: z.string().default('USD').describe('Standard 3-letter ISO currency code (e.g., USD)'),
});

export async function executeCreateOrder(input: z.infer<typeof createOrderSchema>, userPrompt: string) {
  const totalAmount = input.items.reduce((acc, curr) => acc + curr.unitPrice * curr.quantity, 0);

  // Corporate spending policy: transactions >= $500 require Human-in-the-Loop authorization
  const requiresApproval = totalAmount >= 500;
  const initialStatus = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';

  // 1. Invoke PayPal Sandbox API to initialize order
  const paypalRes = await payPalClient.createOrder({
    amount: totalAmount.toFixed(2),
    currency: input.currency,
    description: input.description,
    items: input.items,
  });

  const approvalLink = paypalRes.links?.find((l) => l.rel === 'approve')?.href;

  // 2. Persist order document and execution audit logs in Firestore
  const firestoreId = await savePurchaseOrder({
    prompt: userPrompt,
    department: input.department,
    totalAmount,
    currency: input.currency,
    status: initialStatus,
    paypalOrderId: paypalRes.id,
    approvalLink,
    items: input.items,
    createdAt: new Date().toISOString(),
    logs: [
      {
        timestamp: new Date().toISOString(),
        agentStep: 'INTENT_PARSED',
        detail: `Identified ${input.items.length} line items. Total computed amount: $${totalAmount.toFixed(2)}`,
      },
      {
        timestamp: new Date().toISOString(),
        agentStep: 'POLICY_CHECK',
        detail: requiresApproval 
          ? 'Amount >= $500.00: Requisition placed on hold pending manager authorization.'
          : 'Amount < $500.00: Autonomous straight-through approval granted.',
      },
      {
        timestamp: new Date().toISOString(),
        agentStep: 'PAYPAL_ORDER_CREATED',
        detail: `Initialized PayPal Sandbox order ID: ${paypalRes.id}`,
      },
    ],
  });

  return {
    firestoreId,
    paypalOrderId: paypalRes.id,
    status: initialStatus,
    totalAmount,
    approvalLink,
    message: requiresApproval
      ? `Requisition of $${totalAmount.toFixed(2)} processed. Requires manager approval as it exceeds the $500 threshold.`
      : `Requisition of $${totalAmount.toFixed(2)} approved automatically via PayPal Sandbox.`,
  };
}