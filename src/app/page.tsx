import ChatInterface from '@/components/chat/ChatInterface';
import OrdersAgGrid from '@/components/dashboard/OrdersAgGrid';
import { ShieldCheck } from 'lucide-react';

export default function Home() {
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

      {/* Main Split Grid */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-4rem)]">
        <div className="lg:col-span-5 h-full">
          <ChatInterface />
        </div>
        <div className="lg:col-span-7 h-full">
          <OrdersAgGrid />
        </div>
      </div>
    </main>
  );
}