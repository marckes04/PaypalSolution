'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from 'ag-grid-community';
import { ExternalLink, CheckCircle2, Clock } from 'lucide-react';
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

// Datos base fijos con marcas de tiempo estáticas
const BASE_FIXED_ORDERS: PurchaseOrderDoc[] = [
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

interface OrdersAgGridProps {
  refreshTrigger?: number;
}

export default function OrdersAgGrid({ refreshTrigger }: OrdersAgGridProps) {
  const [rowData, setRowData] = useState<PurchaseOrderDoc[]>(BASE_FIXED_ORDERS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Cargar historial persistido sin modificar registros base
    try {
      const stored = localStorage.getItem('payagent_orders');
      if (stored) {
        const parsed: PurchaseOrderDoc[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, PurchaseOrderDoc>();
          BASE_FIXED_ORDERS.forEach((o) => map.set(o.id, o));
          parsed.forEach((o) => map.set(o.id, o));
          setRowData(Array.from(map.values()));
        }
      }
    } catch {}

    // Inserción fija e inmediata al disparar orden desde el chat
    const handleAddOrder = (event: any) => {
      if (!event.detail) return;
      const newOrder: PurchaseOrderDoc = event.detail;

      setRowData((currentRows) => {
        const filtered = currentRows.filter((o) => o.id !== newOrder.id);
        const updated = [newOrder, ...filtered];
        try {
          localStorage.setItem('payagent_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    window.addEventListener('order-created', handleAddOrder);
    return () => {
      window.removeEventListener('order-created', handleAddOrder);
    };
  }, [refreshTrigger]);

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
            <a
              href={`https://www.sandbox.paypal.com/checkoutnow?token=${params.value}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1"
            >
              {params.value} <ExternalLink size={10} />
            </a>
          );
        },
      },
      {
        headerName: 'HITL Action',
        field: 'approvalUrl',
        flex: 1.2,
        cellRenderer: (params: any) => {
          const order = params.data as PurchaseOrderDoc;

          if (order?.status === 'APPROVED') {
            return <span className="text-emerald-500/80 text-xs">Authorized</span>;
          }

          const url =
            order?.approvalUrl ||
            (order?.paypalOrderId
              ? `https://www.sandbox.paypal.com/checkoutnow?token=${order.paypalOrderId}`
              : null);

          const isPending =
            order?.status === 'PENDING' || order?.status === 'PENDING_APPROVAL';

          if (url && isPending) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
              >
                Authorize <ExternalLink size={12} />
              </a>
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
          {isMounted ? rowData.length : BASE_FIXED_ORDERS.length} Records
        </span>
      </div>

      <div className="flex-1 w-full h-full">
        <AgGridReact
          theme={customDarkTheme}
          rowData={rowData}
          columnDefs={columnDefs}
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