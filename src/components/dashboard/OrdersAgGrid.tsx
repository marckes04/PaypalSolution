'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  ModuleRegistry, 
  AllCommunityModule,
  ValidationModule,
  themeQuartz,
  colorSchemeDark
} from 'ag-grid-community';
import { subscribeToOrders, updateOrderStatus } from '@/lib/firebase/ordersService';
import { PurchaseOrderDoc, OrderStatus } from '@/types/order';
import { ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

// Configuración oficial del tema oscuro v33+
const darkTheme = themeQuartz.withPart(colorSchemeDark);

export default function OrdersAgGrid() {
  const [orders, setOrders] = useState<PurchaseOrderDoc[]>([]);

  useEffect(() => {
    try {
      const unsubscribe = subscribeToOrders((liveOrders) => {
        setOrders(liveOrders);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (err) {
      console.warn('Waiting for Firestore connection...', err);
    }
  }, []);

  const handleApprove = async (order: PurchaseOrderDoc) => {
    if (!order.id) return;
    await updateOrderStatus(order.id, 'APPROVED');
  };

  const handleReject = async (order: PurchaseOrderDoc) => {
    if (!order.id) return;
    await updateOrderStatus(order.id, 'REJECTED');
  };

  const columnDefs = useMemo<ColDef<PurchaseOrderDoc>[]>(() => [
    {
      field: 'id',
      headerName: 'Order ID',
      width: 140,
      valueGetter: (params) => (params.data?.id ? `${params.data.id.substring(0, 8)}...` : 'N/A'),
    },
    {
      field: 'department',
      headerName: 'Department',
      filter: true,
      width: 150,
    },
    {
      field: 'totalAmount',
      headerName: 'Total Amount',
      width: 150,
      valueFormatter: (params) => `$${params.value ? Number(params.value).toFixed(2) : '0.00'} ${params.data?.currency || 'USD'}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 180,
      cellRenderer: (params: { value?: OrderStatus }) => {
        const status = params.value || 'PENDING_APPROVAL';
        const statusColors: Record<OrderStatus, string> = {
          PENDING_APPROVAL: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          APPROVED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          PAID: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          FAILED: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          REJECTED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
        };

        return (
          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[status] || ''}`}>
            {status}
          </span>
        );
      },
    },
    {
      field: 'paypalOrderId',
      headerName: 'PayPal Reference',
      width: 200,
      cellRenderer: (params: { data?: PurchaseOrderDoc }) => {
        if (!params.data?.paypalOrderId) return <span className="text-zinc-500">N/A</span>;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs text-sky-400">
            <span>{params.data.paypalOrderId}</span>
            {params.data.approvalLink && (
              <a
                href={params.data.approvalLink}
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-300"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        );
      },
    },
    {
      headerName: 'HITL Action',
      width: 160,
      cellRenderer: (params: { data?: PurchaseOrderDoc }) => {
        const order = params.data;
        if (!order || order.status !== 'PENDING_APPROVAL') return null;

        return (
          <div className="flex items-center gap-2 h-full">
            <button
              onClick={() => handleApprove(order)}
              className="p-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 transition"
              title="Approve Order"
            >
              <CheckCircle2 size={16} />
            </button>
            <button
              onClick={() => handleReject(order)}
              className="p-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 transition"
              title="Reject Order"
            >
              <XCircle size={16} />
            </button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Live Procurement Ledger</h2>
          <p className="text-xs text-zinc-400">Real-time AG Grid sync with PayPal Sandbox &amp; Firestore</p>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
          {orders.length} Records
        </div>
      </div>
      <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
        <AgGridReact
          theme={darkTheme}
          rowData={orders}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
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