import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrders } from '@/lib/firebase/ordersService';

export async function GET(req: NextRequest) {
  try {
    const _t = req.nextUrl.searchParams.get('t');
    const result = await getPurchaseOrders();

    // Resilient parsing: handles both raw array and wrapped object
    const ordersList = Array.isArray(result) ? result : (result as any)?.orders || [];

    return NextResponse.json(
      { orders: ordersList },
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