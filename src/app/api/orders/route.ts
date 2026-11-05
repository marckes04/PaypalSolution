import { NextResponse } from 'next/server';
import { getPurchaseOrders } from '@/lib/firebase/ordersService';

export async function GET(request: Request) {
  try {
    const orders = await getPurchaseOrders();

    return NextResponse.json(
      { orders },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    console.error('[API_ORDERS_ERROR]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}