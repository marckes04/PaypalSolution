import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  void request.nextUrl.searchParams;

  const db = getDb();

  // Si Firestore no está disponible, leemos del ledger global en memoria de Node
  if (!db) {
    const globalOrders = (global as any).__PAYAGENT_ORDERS__ || [];
    return NextResponse.json({ orders: globalOrders }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  try {
    const q = query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    return NextResponse.json({ orders }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    const globalOrders = (global as any).__PAYAGENT_ORDERS__ || [];
    return NextResponse.json({ orders: globalOrders }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }
}