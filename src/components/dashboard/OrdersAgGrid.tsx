'use client';

import React, { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  ICellRendererParams,
} from 'ag-grid-community';
import { ExternalLink, CheckCircle2, Clock, XCircle, Check, X } from 'lucide-react';
import { PurchaseOrderDoc } from '@/types/order';

ModuleRegistry.registerModules([AllCommunityModule]);

const customDarkTheme = themeQuartz.withParams({
  backgroundColor: '#09090b',
  foregroundColor: '#f4f4f5',
  headerBackgroundColor: '#18181b',
  headerTextColor: '#a1a1aa',
  oddRowBackgroundColor: '#0f0f12',
  borderColor: '#27272a',
  rowHoverColor: '#27272a',
});

interface OrdersAgGridProps {
  orders?: PurchaseOrderDoc[];
  onAction?: (orderId: string, action: 'APPROVED' | 'REJECTED') => void;
}

export default function OrdersAgGrid({ orders = [], onAction }: OrdersAgGridProps) {
  const triggerDecision = useCallback(
    (orderId: string, action: 'APPROVED' | 'REJECTED') => {
      // 1. Ejecutar callback del padre si existe
      if (onAction) {
        onAction(orderId, action);
      }
      // 2. Disparar evento global para garantizar captura
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('order-status-changed', {
            detail: { id: orderId, status: action },
          })
        );
      }
    },
    [onAction]
  );

  const gridContext = useMemo(() => ({ triggerDecision }), [triggerDecision]);

  const columnDefs = useMemo<ColDef<PurchaseOrderDoc>[]>(
    () => [
      {
        headerName: 'Date & Time',
        field: 'createdAt',
        flex: 1.2,
        valueFormatter: (params) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
      {
        headerName: 'Order ID',
        field: 'id',
        flex: 1,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-zinc-400">
            {params.value ? `${String(params.value).slice(0, 11)}...` : '-'}
          </span>
        ),
      },
      {
        headerName: 'Department',
        field: 'department',
        flex: 1,
      },
      {
        headerName: 'Total Amount',
        field: 'totalAmount',
        flex: 1,
        valueFormatter: (params) => {
          const val = Number(params.value) || 0;
          return `$${val.toFixed(2)}`;
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        flex: 1.1,
        cellRenderer: (params: any) => {
          const status = params.value;
          if (status === 'APPROVED') {
            return (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <CheckCircle2 size={13} /> APPROVED
              </span>
            );
          }
          if (status === 'REJECTED') {
            return (
              <span className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-medium">
                <XCircle size={13} /> REJECTED
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-medium">
              <Clock size={13} /> PENDING
            </span>
          );
        },
      },
      {
        headerName: 'PayPal Reference',
        field: 'paypalOrderId',
        flex: 1.2,
        cellRenderer: (params: any) => {
          if (!params.value) return <span className="text-zinc-600">-</span>;
          return (
            <span className="font-mono text-xs text-sky-400 inline-flex items-center gap-1">
              {params.value} <ExternalLink size={10} />
            </span>
          );
        },
      },
      {
        headerName: 'HITL Action',
        field: 'id',
        flex: 1.4,
        cellRenderer: (params: ICellRendererParams<PurchaseOrderDoc>) => {
          const order = params.data;
          if (!order) return null;

          if (order.status === 'APPROVED') {
            return <span className="text-emerald-500/80 text-xs font-medium">Authorized</span>;
          }

          if (order.status === 'REJECTED') {
            return <span className="text-rose-500/80 text-xs font-medium">Declined</span>;
          }

          const isPending =
            order.status === 'PENDING' || order.status === 'PENDING_APPROVAL';

          if (isPending) {
            return (
              <div
                className="flex items-center gap-2 h-full py-1"
                onClick={(e) => e.stopPropagation()} // Previene que AG Grid consuma el evento
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    params.context.triggerDecision(order.id, 'APPROVED');
                  }}
                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Check size={12} /> Approve
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    params.context.triggerDecision(order.id, 'REJECTED');
                  }}
                  className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <X size={12} /> Reject
                </button>
              </div>
            );
          }

          return <span className="text-zinc-600 text-xs">Automated STP</span>;
        },
      },
    ],
    []
  );

  return (
    <div className="h-[600px] w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Live Procurement Ledger</h2>
          <p className="text-xs text-zinc-500">Real-time AG Grid sync with PayPal Sandbox &amp; Firestore</p>
        </div>
        <span
          suppressHydrationWarning
          className="text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/50"
        >
          {orders.length} Records
        </span>
      </div>

      <div className="flex-1 w-full h-full">
        <AgGridReact
          theme={customDarkTheme}
          rowData={orders}
          columnDefs={columnDefs}
          context={gridContext}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
        />
      </div>
    </div>
  );
}