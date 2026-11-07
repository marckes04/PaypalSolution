import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrders } from '@/lib/firebase/ordersService';

export async function GET(req: NextRequest) {
  try {
    // Reading searchParams flags this route handler as dynamic at runtime
    const _t = req.nextUrl.searchParams.get('t');

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
  } catch (error) {
    console.error('[API_ORDERS_GET_ERROR]:', error);
    return NextResponse.json({ orders: [] }, { status: 500 });
  }
}