'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Clock, ShieldCheck, TrendingUp } from 'lucide-react';
import { PurchaseOrderDoc } from '@/types/order';
import { subscribeToOrders } from '@/lib/firebase/ordersService';

export default function KpiCards() {
  const [orders, setOrders] = useState<PurchaseOrderDoc[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      }
    } catch {
      // Ignorar fallos de red silenciosos
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToOrders((liveOrders) => {
      if (liveOrders && liveOrders.length > 0) {
        setOrders(liveOrders);
      }
    });

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const totalSpend = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED');
  const straightThroughCount = approvedOrders.filter((o) => (Number(o.totalAmount) || 0) < 500).length;
  const autonomyRate = orders.length > 0 
    ? Math.round((straightThroughCount / orders.length) * 100) 
    : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs font-medium text-zinc-400">Total Spend Authorized</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">
            ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-sky-400" /> Across all departments
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-800/50 flex items-center justify-center text-sky-400">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs font-medium text-zinc-400">Pending Manager Review</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Requisitions &ge; $500 threshold
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-800/50 flex items-center justify-center text-amber-400">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs font-medium text-zinc-400">Autonomous STP Rate</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{autonomyRate}%</p>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Straight-Through approvals
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}