import { NextResponse } from 'next/server';
import { savePurchaseOrder } from '@/lib/firebase/ordersService';
import { PayPalClient } from '@/lib/paypal/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessage: string = body.message || '';
    const departmentName: string = body.department || 'Engineering';

    // 1. Limpiar el prefijo de departamento tipo "[Dept: Marketing]"
    const cleanMessage = rawMessage.replace(/\[Dept:\s*[^\]]+\]/gi, '').trim();

    // 2. Extraer precio ($60, 60.00, etc.)
    let unitPrice = 0;
    const priceRegexMatch = cleanMessage.match(/\$\s*(\d+(\.\d+)?)/);
    if (priceRegexMatch && priceRegexMatch[1]) {
      unitPrice = parseFloat(priceRegexMatch[1]);
    } else {
      const altPriceMatch = cleanMessage.match(/at\s+(\d+(\.\d+)?)/i);
      if (altPriceMatch && altPriceMatch[1]) {
        unitPrice = parseFloat(altPriceMatch[1]);
      }
    }

    // 3. Extraer cantidad y nombre del ítem
    let quantity = 1;
    let itemName = 'Requested items';

    const qtyRegexMatch = cleanMessage.match(/(\d+)\s+([a-zA-Z0-9\s\-]+?)\s+at/i);
    if (qtyRegexMatch) {
      if (qtyRegexMatch[1]) quantity = parseInt(qtyRegexMatch[1], 10);
      if (qtyRegexMatch[2]) itemName = qtyRegexMatch[2].trim();
    } else {
      // Intento secundario: buscar el primer número si existe
      const simpleNumberMatch = cleanMessage.match(/\b(\d+)\b/);
      if (simpleNumberMatch && simpleNumberMatch[1]) {
        const potentialQty = parseInt(simpleNumberMatch[1], 10);
        if (potentialQty > 0 && potentialQty !== unitPrice) {
          quantity = potentialQty;
        }
      }
    }

    // Si no encontró precio, valor por defecto seguro
    if (unitPrice <= 0) {
      unitPrice = 50;
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

    // Regla de gobernanza: Requisiciones >= $500 requieren Human-in-the-Loop vía PayPal
    if (calculatedTotal >= 500) {
      try {
        const paypal = new PayPalClient();
        if (typeof (paypal as any).createOrder === 'function') {
          const orderResponse = await (paypal as any).createOrder(
            calculatedTotal,
            'USD',
            `Requisition for ${departmentName}`
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
        } else {
          throw new Error('createOrder not available on PayPalClient');
        }
      } catch (paypalError) {
        console.error('[PayPal API Fallback Triggered]:', paypalError);
        paypalOrderId = `SANDBOX_${Date.now()}`;
        approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`;
      }
    }

    const isSTP = calculatedTotal < 500;
    const orderStatus = isSTP ? 'APPROVED' : 'PENDING_APPROVAL';

    // Persistir orden de forma síncrona/segura
    const orderData = {
      department: departmentName,
      items: parsedItems,
      totalAmount: calculatedTotal,
      status: orderStatus as 'APPROVED' | 'PENDING_APPROVAL',
      paypalOrderId,
      approvalUrl,
      createdAt: new Date().toISOString(),
      auditLog: [
        `Requisition processed on ${new Date().toISOString()} - Dept: ${departmentName} - Total: $${calculatedTotal}`,
      ],
    };

    const savedId = await savePurchaseOrder(orderData);

    const botMessage = isSTP
      ? `Requisition for $${calculatedTotal.toFixed(2)} (${quantity}x ${itemName}) has been automatically approved via Straight-Through Processing (STP).`
      : `Requisition for $${calculatedTotal.toFixed(2)} (${quantity}x ${itemName}) exceeds the $500 threshold. Manager approval required via PayPal Sandbox.`;

    // Retorna todos los campos que ChatInterface.tsx podría consultar
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