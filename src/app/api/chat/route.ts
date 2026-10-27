import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createOrderSchema, executeCreateOrder } from '@/lib/agent/tools/createOrderTool';
import { z } from 'zod';

export const maxDuration = 30;

function parseRequisitionFallback(promptText: string): z.infer<typeof createOrderSchema> {
  // Regex determinista para extraer cantidades, precios y descripciones
  // Ejemplo: "Procure 3 high-resolution monitors at $300 each"
  const qtyMatch = promptText.match(/(\d+)\s+([a-zA-Z\s\-]+?)\s+(?:at|for|@)\s+\$?(\d+(?:\.\d{1,2})?)/i);
  
  let dept = 'Engineering';
  const deptMatch = promptText.match(/\[Dept:\s*([^\]]+)\]/i);
  if (deptMatch) {
    dept = deptMatch[1].trim();
  }

  if (qtyMatch) {
    const quantity = parseInt(qtyMatch[1], 10);
    const itemName = qtyMatch[2].replace(/^(procure|order|buy)\s+/i, '').trim();
    const unitPrice = parseFloat(qtyMatch[3]);

    return {
      department: dept,
      items: [
        {
          name: itemName || 'Standard Procurement Item',
          quantity: isNaN(quantity) ? 1 : quantity,
          unitPrice: isNaN(unitPrice) ? 50 : unitPrice,
        },
      ],
      notes: promptText,
    };
  }

  return {
    department: dept,
    items: [{ name: 'Workstation Equipment', quantity: 1, unitPrice: 150 }],
    notes: promptText,
  };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .pop()?.content || '';

    let requisitionData: z.infer<typeof createOrderSchema>;

    // Intento 1: Parseo semántico con Gemini
    try {
      const extractionPrompt = `You are PayAgent Parser. Analyze this procurement request: "${lastUserMessage}".
Extract:
- items: array of { name: string, quantity: number, unitPrice: number }
- department: string (default "Engineering" if not specified)
- notes: brief justification`;

      const { text: parsedJson } = await generateText({
        model: google('gemini-1.5-flash-latest'),
        prompt: `${extractionPrompt}\nRespond ONLY with a valid JSON matching: {"department": string, "items": [{"name": string, "quantity": number, "unitPrice": number}], "notes": string}. No formatting.`,
      });

      const cleanJson = parsedJson.replace(/```json/g, '').replace(/```/g, '').trim();
      requisitionData = JSON.parse(cleanJson);
    } catch {
      // Intento 2: Fallback determinista de procesamiento de lenguaje natural local
      requisitionData = parseRequisitionFallback(lastUserMessage);
    }

    // 2. Ejecutar la creación de la orden en PayPal Sandbox & Registrar en Ledger
    const orderResult = await executeCreateOrder(requisitionData, lastUserMessage);

    // 3. Elaborar la respuesta con el cálculo y el estado de la política
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
      (orderResult.approvalLink ? `👉 [Review & Authorize in PayPal Sandbox](${orderResult.approvalLink})` : `Autonomous procurement completed via PayPal Sandbox.`);

    return new Response(responseText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: unknown) {
    console.error('=== API CHAT ERROR TRACE ===', error);
    const message = error instanceof Error ? error.message : 'Requisition error';
    return new Response(`Requisition execution failed: ${message}`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}