'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  ICellRendererParams,
} from 'ag-grid-community';
import { ExternalLink, CheckCircle2, Clock, XCircle, Check, X, Filter } from 'lucide-react';
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
  // Estado para alternar entre ver todas o solo las pendientes
  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING'>('ALL');

  const triggerDecision = useCallback(
    (orderId: string, action: 'APPROVED' | 'REJECTED') => {
      if (onAction) {
        onAction(orderId, action);
      }
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

  // Contar órdenes pendientes para el badge numérico del botón
  const pendingCount = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'PENDING' || o.status === 'PENDING_APPROVAL'
    ).length;
  }, [orders]);

  // Filtrado reactivo de las filas pasadas al AG Grid
  const displayedOrders = useMemo(() => {
    if (filterMode === 'PENDING') {
      return orders.filter(
        (o) => o.status === 'PENDING' || o.status === 'PENDING_APPROVAL'
      );
    }
    return orders;
  }, [orders, filterMode]);

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
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    params.context.triggerDecision(order.id, 'APPROVED');
                  }}
                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Approve Requisition"
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
                  title="Reject Requisition"
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
      {/* Encabezado con selector de filtros */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Live Procurement Ledger</h2>
          <p className="text-xs text-zinc-500">Real-time AG Grid sync with PayPal Sandbox &amp; Firestore</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botones de alternancia de vista */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filterMode === 'ALL'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('PENDING')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                filterMode === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-amber-400'
              }`}
            >
              <Filter size={12} />
              Pending Review
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[10px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          <span
            suppressHydrationWarning
            className="text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/50"
          >
            {displayedOrders.length} Shown
          </span>
        </div>
      </div>

      <div className="flex-1 w-full h-full">
        <AgGridReact
          theme={customDarkTheme}
          rowData={displayedOrders}
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