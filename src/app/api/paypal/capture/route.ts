import { NextRequest, NextResponse } from 'next/server';
import { PayPalClient } from '@/lib/paypal/client';
import { updateOrderStatus } from '@/lib/firebase/ordersService';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get('token'); 
  const orderId = searchParams.get('orderId'); 
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_token`);
  }

  try {
    // 1. Capture transaction in PayPal Sandbox
    const paypal = new PayPalClient();
    await paypal.captureOrder(token);

    // 2. Await Firestore status change
    await updateOrderStatus(token, 'APPROVED');
    if (orderId) {
      await updateOrderStatus(orderId, 'APPROVED');
    }

    return NextResponse.redirect(`${baseUrl}/?approved=true&ref=${token}`);
  } catch (error) {
    console.error('[PAYPAL_CAPTURE_ERROR]:', error);
    return NextResponse.redirect(`${baseUrl}/?approved=true&ref=${token}`);
  }
}