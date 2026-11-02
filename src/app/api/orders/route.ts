import { NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/firebase/ordersStorage';

export async function GET() {
  try {
    const orders = getAllOrders();
    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    console.error('[API_ORDERS_ERROR]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}