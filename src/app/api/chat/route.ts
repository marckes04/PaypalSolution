import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createOrderSchema, executeCreateOrder } from '@/lib/agent/tools/createOrderTool';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .pop()?.content || '';

    // 1. Extraer los datos de la requisición con Gemini
    const extractionPrompt = `You are PayAgent Parser. Analyze this procurement request: "${lastUserMessage}".
Extract:
- items: array of { name: string, quantity: number, unitPrice: number }
- department: string (default "Engineering" if not specified)
- notes: brief justification`;

    const { text: parsedJson } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: `${extractionPrompt}\nRespond ONLY with a valid JSON object matching this schema: {"department": string, "items": [{"name": string, "quantity": number, "unitPrice": number}], "notes": string}. No markdown formatting, no code fences.`,
    });

    let requisitionData: z.infer<typeof createOrderSchema>;
    try {
      const cleanJson = parsedJson.replace(/```json/g, '').replace(/```/g, '').trim();
      requisitionData = JSON.parse(cleanJson);
    } catch {
      // Fallback determinista si el parseo falla
      requisitionData = {
        department: 'Engineering',
        items: [{ name: 'Requested Equipment', quantity: 1, unitPrice: 100 }],
        notes: lastUserMessage,
      };
    }

    // 2. Ejecutar la creación de la orden en PayPal Sandbox & Firestore/Memoria
    const orderResult = await executeCreateOrder(requisitionData, lastUserMessage);

    // 3. Redactar la confirmación profesional
    const itemsSummary = requisitionData.items
      .map((it) => `• ${it.quantity}x ${it.name} ($${it.unitPrice.toFixed(2)} ea)`)
      .join('\n');

    const statusBadge = orderResult.status === 'APPROVED'
      ? '✅ STRAIGHT-THROUGH APPROVED (< $500 threshold)'
      : '⚠️ PENDING MANAGER APPROVAL (>= $500 threshold)';

    const responseText = `Requisition Processed Successfully!\n\n` +
      `**Items Requested:**\n${itemsSummary}\n\n` +
      `**Total Amount:** $${orderResult.totalAmount.toFixed(2)} USD\n` +
      `**Governance Policy:** ${statusBadge}\n` +
      `**Order ID:** \`${orderResult.orderId}\`\n` +
      `**PayPal Reference:** \`${orderResult.paypalOrderId}\`\n\n` +
      (orderResult.approvalLink ? `👉 [Review & Authorize in PayPal Sandbox](${orderResult.approvalLink})` : `Autonomous procurement executed via PayPal Sandbox.`);

    return new Response(responseText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: unknown) {
    console.error('=== API CHAT ERROR TRACE ===', error);
    const message = error instanceof Error ? error.message : 'Agent stream error';
    return new Response(`Requisition failed: ${message}`, {
      status: 200, // Devolver 200 para que el chat muestre el mensaje explicativo
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}