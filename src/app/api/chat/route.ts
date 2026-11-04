import { NextResponse } from 'next/server';
import { savePurchaseOrder } from '@/lib/firebase/ordersService';
import { PayPalClient } from '@/lib/paypal/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessage: string = body.message || '';
    const activeDepartment: string = (body.department || 'Engineering').trim();

    // 1. Quitar cualquier prefijo tipo "[Dept: ...]" para analizar solo el mensaje real
    const userPrompt = rawMessage.replace(/^\[Dept:\s*[^\]]+\]\s*/i, '').trim();

    // 2. Extraer el departamento solicitado mediante "for <Depto>" o "para <Depto>"
    const forMatch = userPrompt.match(/\b(?:for|to|para)\s+([a-zA-Z]+)\b/i);

    if (forMatch && forMatch[1]) {
      const targetDept = forMatch[1].trim();
      const validDepartments = [
        'Marketing',
        'Engineering',
        'Sales',
        'Finance',
        'Operations',
        'HR',
        'Legal',
      ];

      const matchedValidDept = validDepartments.find(
        (d) => d.toLowerCase() === targetDept.toLowerCase()
      );

      // Si el departamento mencionado tras "for" existe y es diferente al seleccionado en la UI
      if (
        matchedValidDept &&
        matchedValidDept.toLowerCase() !== activeDepartment.toLowerCase()
      ) {
        const mismatchMessage = `⚠️ Policy Mismatch: You requested supplies for **${matchedValidDept}**, but your active workspace is set to **${activeDepartment}**. Please switch your department selector to ${matchedValidDept} before submitting this requisition.`;

        return NextResponse.json({
          success: false,
          requiresDeptChange: true,
          status: 'REJECTED',
          reply: mismatchMessage,
          message: mismatchMessage,
          response: mismatchMessage,
          content: mismatchMessage,
        });
      }
    }

    // 3. Extracción de precio explícito ($60, at 60, etc.)
    let unitPrice = 0;
    const priceRegexMatch = userPrompt.match(/\$\s*(\d+(\.\d+)?)/);
    if (priceRegexMatch && priceRegexMatch[1]) {
      unitPrice = parseFloat(priceRegexMatch[1]);
    } else {
      const altPriceMatch = userPrompt.match(/\bat\s+(\d+(\.\d+)?)/i);
      if (altPriceMatch && altPriceMatch[1]) {
        unitPrice = parseFloat(altPriceMatch[1]);
      }
    }

    // 4. Extracción de cantidad y descripción del ítem
    let quantity = 1;
    let itemName = '';

    const qtyRegexMatch = userPrompt.match(/(\d+)\s+([a-zA-Z0-9\s\-]+?)\s+at/i);
    if (qtyRegexMatch) {
      if (qtyRegexMatch[1]) quantity = parseInt(qtyRegexMatch[1], 10);
      if (qtyRegexMatch[2]) itemName = qtyRegexMatch[2].trim();
    } else {
      const simpleNumberMatch = userPrompt.match(/\b(\d+)\b/);
      if (simpleNumberMatch && simpleNumberMatch[1]) {
        const potentialQty = parseInt(simpleNumberMatch[1], 10);
        if (potentialQty > 0 && potentialQty !== unitPrice) {
          quantity = potentialQty;
        }
      }
    }

    // 5. Verificación de intención de compra y datos mínimos requeridos
    const procurementKeywords = /\b(procure|buy|order|purchase|need|request|requisition|comprar|pedir|solicitar|adquirir)\b/i;
    const hasProcurementIntent = procurementKeywords.test(userPrompt);

    // Si NO hay intención de compra o NO se especificó un precio válido:
    // NO se crea orden ni se llama a PayPal, solo se responde conversacionalmente
    if (!hasProcurementIntent || unitPrice <= 0) {
      const helpMessage = `I am PayAgent, your procurement copilot. To submit a requisition, please specify the quantity, item description, and price (e.g., "Procure 2 ergonomic keyboards at $60 each for ${activeDepartment}").`;

      return NextResponse.json({
        success: true,
        status: 'IGNORED',
        reply: helpMessage,
        message: helpMessage,
        response: helpMessage,
        content: helpMessage,
      });
    }

    if (!itemName) {
      itemName = 'Requested items';
    }

    const calculatedTotal = Number((quantity * unitPrice).toFixed(2));

    const parsedItems = [
      {
        name: itemName,
        quantity: quantity,
        unitPrice: unitPrice,
      },
    ];

    let paypalOrderId: string | null = null;
    let approvalUrl: string | null = null;

    // 6. Regla de gobernanza: Requisiciones >= $500 requieren Human-in-the-Loop vía PayPal
    if (calculatedTotal >= 500) {
      try {
        const paypal = new PayPalClient();
        if (typeof (paypal as any).createOrder === 'function') {
          const orderResponse = await (paypal as any).createOrder(
            calculatedTotal,
            'USD',
            `Requisition for ${activeDepartment}`
          );
          if (orderResponse && orderResponse.id) {
            paypalOrderId = orderResponse.id;
            const approveLink = orderResponse.links?.find(
              (link: any) => link.rel === 'approve'
            );
            approvalUrl = approveLink
              ? approveLink.href
              : `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`;
          }
        }
      } catch (paypalError) {
        console.error('[PayPal API Fallback Triggered]:', paypalError);
        paypalOrderId = `SANDBOX_${Date.now()}`;
        approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`;
      }
    }

    const isSTP = calculatedTotal < 500;
    const orderStatus = isSTP ? 'APPROVED' : 'PENDING_APPROVAL';
    const timestampIso = new Date().toISOString();

    // 7. Guardar la orden en Firestore / almacenamiento local cumpliendo la interfaz PurchaseOrderDoc
    const orderData: any = {
      prompt: userPrompt,
      department: activeDepartment,
      currency: 'USD',
      items: parsedItems,
      totalAmount: calculatedTotal,
      status: orderStatus as 'APPROVED' | 'PENDING_APPROVAL',
      paypalOrderId,
      approvalUrl,
      approvalLink: approvalUrl || '',
      createdAt: timestampIso,
      logs: [
        {
          timestamp: timestampIso,
          agentStep: 'POLICY_EVALUATION',
          detail: isSTP
            ? `Total $${calculatedTotal.toFixed(2)} USD is under threshold ($500.00). Straight-Through APPROVED.`
            : `Total $${calculatedTotal.toFixed(2)} USD exceeds corporate threshold ($500.00). Routed to PENDING_APPROVAL.`,
        },
      ],
      auditLog: [
        `Requisition processed on ${timestampIso} - Dept: ${activeDepartment} - Total: $${calculatedTotal}`,
      ],
    };

    const savedId = await savePurchaseOrder(orderData);

    const botMessage = isSTP
      ? `Requisition for $${calculatedTotal.toFixed(2)} (${quantity}x ${itemName}) has been automatically approved via Straight-Through Processing (STP).`
      : `Requisition for $${calculatedTotal.toFixed(2)} (${quantity}x ${itemName}) exceeds the $500 threshold. Manager approval required via PayPal Sandbox.`;

    return NextResponse.json({
      success: true,
      orderId: savedId,
      status: orderStatus,
      approvalUrl: approvalUrl,
      reply: botMessage,
      message: botMessage,
      response: botMessage,
      content: botMessage,
    });
  } catch (error: any) {
    console.error('[API /api/chat Error]:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to process requisition',
      },
      { status: 500 }
    );
  }
}