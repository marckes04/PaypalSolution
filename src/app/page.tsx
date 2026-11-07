'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChatInterface from '@/components/chat/ChatInterface';
import OrdersAgGrid from '@/components/dashboard/OrdersAgGrid';
import KpiCards from '@/components/dashboard/KpiCards';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { PurchaseOrderDoc } from '@/types/order';

const INITIAL_ORDERS: PurchaseOrderDoc[] = [
  {
    id: 'po_1794009581',
    createdAt: '2026-11-07T01:15:00.000Z',
    department: 'Engineering',
    totalAmount: 120.0,
    status: 'APPROVED',
  },
  {
    id: 'po_1794009320',
    createdAt: '2026-11-07T00:50:00.000Z',
    department: 'Engineering',
    totalAmount: 850.0,
    status: 'PENDING',
    paypalOrderId: '78B099547L735113U',
    approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=78B099547L735113U',
  },
  {
    id: 'po_1794009110',
    createdAt: '2026-11-07T00:20:00.000Z',
    department: 'Engineering',
    totalAmount: 400.0,
    status: 'APPROVED',
  },
];

function DashboardContent() {
  const [orders, setOrders] = useState<PurchaseOrderDoc[]>(INITIAL_ORDERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Cargar historial persistido desde localStorage tras el montaje del cliente
  useEffect(() => {
    try {
      const stored = localStorage.getItem('payagent_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
        }
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
  }, []);

  // 2. Función centralizada para aprobar o rechazar transacciones (HITL)
  const applyDecision = (orderId: string, status: 'APPROVED' | 'REJECTED') => {
    setOrders((prev) => {
      const updated = prev.map((ord) => {
        if (ord.id === orderId || ord.paypalOrderId === orderId) {
          return { ...ord, status };
        }
        return ord;
      });
      try {
        localStorage.setItem('payagent_orders', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving decision to localStorage:', e);
      }
      return [...updated];
    });

    setRefreshKey((k) => k + 1);

    if (status === 'APPROVED') {
      setSuccessBanner(`Order ${orderId} successfully authorized by Procurement Manager.`);
    } else {
      setSuccessBanner(`Order ${orderId} rejected by Procurement Policy Override.`);
    }
    const timer = setTimeout(() => setSuccessBanner(null), 5000);
    return () => clearTimeout(timer);
  };

  // 3. Listener de eventos globales para capturar decisiones de AG Grid
  useEffect(() => {
    const handleStatusEvent = (event: any) => {
      if (event.detail && event.detail.id && event.detail.status) {
        applyDecision(event.detail.id, event.detail.status);
      }
    };

    window.addEventListener('order-status-changed', handleStatusEvent);
    return () => window.removeEventListener('order-status-changed', handleStatusEvent);
  }, []);

  // 4. Detección de retorno automático desde PayPal Sandbox
  useEffect(() => {
    if (searchParams.get('approved') === 'true') {
      const ref = searchParams.get('ref') || 'Processed';
      applyDecision(ref, 'APPROVED');
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  // 5. Inserción inmediata de una orden creada en el chat
  const handleOrderCreated = (newOrder?: any) => {
    if (newOrder && newOrder.id) {
      setOrders((prev) => {
        const updated = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
        try {
          localStorage.setItem('payagent_orders', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving new order to localStorage:', e);
        }
        return [...updated];
      });
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Barra superior de navegación */}
      <header className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-600/30">
            PA
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-sm md:text-base">PayAgent</h1>
            <p className="text-[11px] text-zinc-500 font-medium">B2B Procure-to-Pay Autonomous Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <ShieldCheck size={14} />
            PayPal Sandbox Connected
          </span>
        </div>
      </header>

      {/* Banner de confirmación */}
      {successBanner && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center gap-2 text-xs font-medium text-emerald-400 transition-all">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Panel principal */}
      <div className="flex-1 p-6 flex flex-col max-w-[1800px] w-full mx-auto">
        {/* Tarjetas KPI conectadas de forma reactiva a orders */}
        <KpiCards key={`kpi-${refreshKey}`} orders={orders} />

        {/* Distribución dividida de Chat y Tabla AG Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px] h-[calc(100vh-16rem)]">
          <div className="lg:col-span-5 h-full">
            <ChatInterface onOrderCreated={handleOrderCreated} />
          </div>
          <div className="lg:col-span-7 h-full">
            <OrdersAgGrid
              key={`grid-${refreshKey}`}
              orders={orders}
              onAction={applyDecision}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <DashboardContent />
    </Suspense>
  );
}