'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChatInterface from '@/components/chat/ChatInterface';
import OrdersAgGrid from '@/components/dashboard/OrdersAgGrid';
import KpiCards from '@/components/dashboard/KpiCards';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

function DashboardContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Detectar retorno de PayPal Sandbox
  useEffect(() => {
    if (searchParams.get('approved') === 'true') {
      const ref = searchParams.get('ref') || 'Processed';
      
      // 1. Forzar refresco inmediato de KPIs y AG Grid
      setRefreshKey((prev) => prev + 1);
      
      // 2. Mostrar banner de éxito temporal
      setSuccessBanner(`Order successfully authorized via PayPal Sandbox (Ref: ${ref})`);
      const timer = setTimeout(() => setSuccessBanner(null), 6000);

      // 3. Limpiar la URL sin recargar la página
      router.replace('/', { scroll: false });

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  const handleOrderCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navigation */}
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

      {/* Banner de confirmación post-aprobación */}
      {successBanner && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center gap-2 text-xs font-medium text-emerald-400 transition-all">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 p-6 flex flex-col max-w-[1800px] w-full mx-auto">
        {/* Real-Time Governance & Financial KPIs */}
        <KpiCards key={`kpi-${refreshKey}`} />

        {/* Main Split Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px] h-[calc(100vh-16rem)]">
          <div className="lg:col-span-5 h-full">
            <ChatInterface onOrderCreated={handleOrderCreated} />
          </div>
          <div className="lg:col-span-7 h-full">
            <OrdersAgGrid key={`grid-${refreshKey}`} refreshTrigger={refreshKey} />
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