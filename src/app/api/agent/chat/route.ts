import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { createOrderSchema, executeCreateOrder } from '@/lib/agent/tools/createOrderTool';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `You are PayAgent, an enterprise Autonomous B2B Procure-to-Pay Copilot.
Your mission is to evaluate employee procurement requests, parse items, prices, and quantities deterministically, and execute or schedule orders via PayPal Sandbox.

RULES:
1. Always execute the "create_order" tool when the user requests to buy, purchase, or procure equipment or items.
2. In your final text response to the user, summarize the order details:
   - Items and total calculated cost.
   - Status: whether it was straight-through approved (< $500) or requires manager approval (>= $500).
   - Order ID and PayPal Reference ID.`;

    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages,
      maxSteps: 3,
      tools: {
        create_order: tool({
          description: 'Generates an itemized procurement requisition and processes via PayPal Sandbox.',
          parameters: createOrderSchema,
          execute: async (params) => {
            const lastUserMessage = messages
              .filter((m: { role: string }) => m.role === 'user')
              .pop()?.content || 'Requisition';
            return await executeCreateOrder(
              params,
              typeof lastUserMessage === 'string' ? lastUserMessage : JSON.stringify(lastUserMessage)
            );
          },
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('=== API CHAT ERROR TRACE ===', error);
    const message = error instanceof Error ? error.message : 'Agent stream error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}