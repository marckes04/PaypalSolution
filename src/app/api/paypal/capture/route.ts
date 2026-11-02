import { NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/firebase/ordersStorage';

export async function GET() {
  try {
    const orders = getAllOrders();
    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}