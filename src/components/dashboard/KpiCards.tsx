'use client';

import React from 'react';
import { DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { PurchaseOrderDoc } from '@/types/order';

interface KpiCardsProps {
  orders?: PurchaseOrderDoc[];
}

export default function KpiCards({ orders = [] }: KpiCardsProps) {
  // 1. Total Spend: Suma únicamente las órdenes autorizadas/aprobadas
  const totalAuthorized = orders
    .filter((o) => o.status === 'APPROVED')
    .reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);

  // 2. Pending Review: Cuenta ÚNICAMENTE las órdenes pendientes
  const pendingCount = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'PENDING_APPROVAL'
  ).length;

  // 3. Autonomous STP Rate: % de órdenes aprobadas de forma directa sin requerir HITL
  const totalCount = orders.length;
  const approvedCount = orders.filter((o) => o.status === 'APPROVED').length;
  const stpRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Total Spend Authorized */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-400">Total Spend Authorized</p>
          <h3 className="text-2xl font-bold text-zinc-100 mt-1">
            ${totalAuthorized.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">↗</span> Across all departments
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <DollarSign size={20} />
        </div>
      </div>

      {/* Pending Manager Review */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-400">Pending Manager Review</p>
          <h3 className="text-2xl font-bold text-zinc-100 mt-1">{pendingCount}</h3>
          <p className="text-[11px] text-zinc-500 mt-1">Requisitions ≥ $500 threshold</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Clock size={20} />
        </div>
      </div>

      {/* Autonomous STP Rate */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-400">Autonomous STP Rate</p>
          <h3 className="text-2xl font-bold text-zinc-100 mt-1">{stpRate}%</h3>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">✔</span> Straight-Through approvals
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <ShieldCheck size={20} />
        </div>
      </div>
    </div>
  );
}