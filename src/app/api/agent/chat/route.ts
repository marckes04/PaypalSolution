import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { createOrderSchema, executeCreateOrder } from '@/lib/agent/tools/createOrderTool';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `You are PayAgent, an enterprise Autonomous B2B Procure-to-Pay Copilot.
Your mission is to evaluate employee procurement requests, parse items, prices, and quantities deterministically, and execute or schedule orders via PayPal Sandbox.

RULES:
1. When a user requests to buy, order, license, or procure items, execute the "create_order" tool.
2. Inquire for specifics (department, quantities, or prices) only if essential parameters are missing. If reasonable assumptions can be made based on user prompt, proceed with the tool call.
3. Corporate Policy Threshold: Any order total >= $500 requires Human-in-the-Loop manager approval. Orders < $500 are eligible for straight-through approval.
4. Keep natural language responses concise, professional, and audit-ready. Always state the computed total and the assigned PayPal Order ID when an order is generated.`;

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages,
      tools: {
        create_order: tool({
          description: 'Generates an itemized procurement requisition, validates company policies, and creates an order in PayPal Sandbox.',
          parameters: createOrderSchema,
          execute: async (params) => {
            const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop()?.content || 'Purchase Requisition';
            return await executeCreateOrder(params, typeof lastUserMessage === 'string' ? lastUserMessage : JSON.stringify(lastUserMessage));
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Agent stream error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}