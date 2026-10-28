import { NextResponse, type NextRequest } from 'next/server';
import { payPalClient } from '@/lib/paypal/client';
import { updateOrderStatus } from '@/lib/firebase/ordersService';

// Maneja la redirección del navegador (GET) al volver de PayPal Sandbox
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/?error=missing_token', request.url));
    }

    // 1. Capturar la orden en PayPal Sandbox
    const captureResult = await payPalClient.captureOrder(token);

    // 2. Si se completó o aprobó, actualizar en el ledger
    if (captureResult.status === 'COMPLETED' || captureResult.status === 'APPROVED') {
      const globalOrders: any[] = (global as any).__PAYAGENT_ORDERS__ || [];
      const targetOrder = globalOrders.find((o) => o.paypalOrderId === token);

      if (targetOrder) {
        await updateOrderStatus(targetOrder.id, 'APPROVED', token);
      }
    }

    // 3. Volver a la pantalla principal
    return NextResponse.redirect(new URL('/?captured=true', request.url));
  } catch (error: unknown) {
    console.error('[PayPal Capture GET Error]:', error);
    return NextResponse.redirect(new URL('/?error=capture_failed', request.url));
  }
}

// Maneja peticiones manuales vía POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token || body.paypalOrderId;

    if (!token) {
      return NextResponse.json({ error: 'Missing PayPal token' }, { status: 400 });
    }

    const captureResult = await payPalClient.captureOrder(token);

    if (captureResult.status === 'COMPLETED' || captureResult.status === 'APPROVED') {
      const globalOrders: any[] = (global as any).__PAYAGENT_ORDERS__ || [];
      const targetOrder = globalOrders.find((o) => o.paypalOrderId === token);

      if (targetOrder) {
        await updateOrderStatus(targetOrder.id, 'APPROVED', token);
      }

      return NextResponse.json({
        success: true,
        status: captureResult.status,
        paypalOrderId: token,
      });
    }

    return NextResponse.json({ success: false, status: captureResult.status }, { status: 400 });
  } catch (error: unknown) {
    console.error('[PayPal Capture POST Error]:', error);
    const message = error instanceof Error ? error.message : 'Capture error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}