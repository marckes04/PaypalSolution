import { NextRequest, NextResponse } from 'next/server';
import { PayPalClient } from '@/lib/paypal/client';
import { savePurchaseOrder } from '@/lib/firebase/ordersService';

interface ParsedRequisition {
  isProcurementRequest: boolean;
  department: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = (body.message || '').trim();
    const activeDept: string = body.department || 'Engineering';

    // 1. Filter out empty, random, or short inputs ('s', 'as', etc.)
    if (!message || message.length < 5) {
      return NextResponse.json({
        reply: "Please provide a valid procurement request. Example: 'Procure 2 ergonomic keyboards at $60 each for Engineering'.",
        success: false,
      });
    }

    // 2. Entity Extraction
    let parsed: ParsedRequisition | null = null;
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const systemPrompt = `You are a B2B procurement engine. Extract requisition data and return ONLY a valid JSON object matching this schema:
        {
          "isProcurementRequest": boolean,
          "department": string,
          "items": [{"name": string, "quantity": number, "unitPrice": number}],
          "totalAmount": number
        }
        If the message is not a valid procurement requisition, set isProcurementRequest to false.`;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `[Dept: ${activeDept}] ${message}` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
          }),
        });

        if (res.ok) {
          const completion = await res.json();
          parsed = JSON.parse(completion.choices[0].message.content);
        }
      } catch (aiErr) {
        console.warn('[AI_FALLBACK_TRIGGERED]:', aiErr);
      }
    }

    // Heuristic fallback if API key is missing or LLM call fails
    if (!parsed || !parsed.isProcurementRequest || !parsed.items || parsed.items.length === 0) {
      const regex = /(?:procure|buy|order)?\s*(\d+)\s+([a-zA-Z\s]+?)\s+(?:at|for)?\s*\$?(\d+(?:\.\d+)?)/i;
      const match = message.match(regex);

      if (match) {
        const qty = parseInt(match[1], 10);
        const name = match[2].trim();
        const price = parseFloat(match[3]);
        parsed = {
          isProcurementRequest: true,
          department: activeDept,
          items: [{ name, quantity: qty, unitPrice: price }],
          totalAmount: qty * price,
        };
      } else {
        return NextResponse.json({
          reply: "Could not identify valid items or amounts. Please follow this format: 'Procure [quantity] [item] at $[price] each'.",
          success: false,
        });
      }
    }

    const total = parsed.totalAmount;
    const internalOrderId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const THRESHOLD = 500.0;

    // 3. Corporate Governance: STP (< $500) vs HITL via PayPal (>= $500)
    if (total < THRESHOLD) {
      const orderRecord = {
        id: internalOrderId,
        prompt: message,
        department: parsed.department || activeDept,
        currency: 'USD',
        items: parsed.items,
        totalAmount: total,
        status: 'APPROVED',
        paypalOrderId: null,
        approvalUrl: null,
        approvalLink: '',
        createdAt: new Date().toISOString(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            agentStep: 'POLICY_EVALUATION',
            detail: `Total $${total.toFixed(2)} USD is under threshold ($${THRESHOLD.toFixed(2)}). Straight-Through APPROVED.`,
          },
        ],
        auditLog: [
          `Requisition processed on ${new Date().toISOString()} - Dept: ${parsed.department || activeDept} - Total: $${total}`,
        ],
      };

      await savePurchaseOrder(orderRecord);

      return NextResponse.json({
        reply: `Requisition processed successfully under Straight-Through Processing (Total: $${total.toFixed(2)} USD). Status: APPROVED.`,
        success: true,
        order: orderRecord,
      });
    } else {
      // High-value spend (>= $500): Generate PayPal Sandbox Order
      const paypal = new PayPalClient();
      const paypalOrder = await paypal.createOrder(
        total,
        'USD',
        `Requisition ${internalOrderId} for ${parsed.department || activeDept}`,
        internalOrderId
      );

      const approvalUrl = paypalOrder.links?.find((l: any) => l.rel === 'approve')?.href || '';

      const orderRecord = {
        id: internalOrderId,
        prompt: message,
        department: parsed.department || activeDept,
        currency: 'USD',
        items: parsed.items,
        totalAmount: total,
        status: 'PENDING_APPROVAL',
        paypalOrderId: paypalOrder.id,
        approvalUrl: approvalUrl,
        approvalLink: approvalUrl,
        createdAt: new Date().toISOString(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            agentStep: 'POLICY_EVALUATION',
            detail: `Total $${total.toFixed(2)} USD exceeds corporate threshold ($${THRESHOLD.toFixed(2)}). Routed to PENDING_APPROVAL.`,
          },
        ],
        auditLog: [
          `Requisition processed on ${new Date().toISOString()} - Dept: ${parsed.department || activeDept} - Total: $${total}`,
        ],
      };

      await savePurchaseOrder(orderRecord);

      return NextResponse.json({
        reply: `Requisition for $${total.toFixed(2)} USD exceeds the $500 threshold. Managerial authorization required via PayPal Sandbox.`,
        success: true,
        order: orderRecord,
        approvalUrl: approvalUrl,
      });
    }
  } catch (err: any) {
    console.error('[API_CHAT_CRITICAL_ERROR]:', err);
    return NextResponse.json(
      {
        reply: "An error occurred while evaluating the requisition. Please verify input parameters and try again.",
        success: false,
      },
      { status: 200 }
    );
  }
}