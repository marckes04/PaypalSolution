'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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

const SEED_DATA: PurchaseOrderDoc[] = [
  {
    id: 'po_demo_01',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    department: 'Engineering',
    totalAmount: 120.0,
    status: 'APPROVED',
  },
  {
    id: 'po_demo_02',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    department: 'Engineering',
    totalAmount: 850.0,
    status: 'PENDING',
    paypalOrderId: '78B099547L735113U',
    approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=78B099547L735113U',
  },
];

interface OrdersAgGridProps {
  refreshTrigger?: number;
}

export default function OrdersAgGrid({ refreshTrigger }: OrdersAgGridProps) {
  const [rowData, setRowData] = useState<PurchaseOrderDoc[]>(SEED_DATA);
  const [isMounted, setIsMounted] = useState(false);

  const loadAndSyncOrders = useCallback(async () => {
    let localData: PurchaseOrderDoc[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('payagent_orders');
        if (stored) localData = JSON.parse(stored);
      } catch {}
    }

    try {
      const res = await fetch(`/api/orders?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const apiList: PurchaseOrderDoc[] = Array.isArray(data) ? data : data.orders || [];

        const map = new Map<string, PurchaseOrderDoc>();
        SEED_DATA.forEach((item) => map.set(item.id, item));
        localData.forEach((item) => map.set(item.id, item));
        apiList.forEach((item) => map.set(item.id, item));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setRowData(merged);
        if (typeof window !== 'undefined') {
          localStorage.setItem('payagent_orders', JSON.stringify(merged));
        }
        return;
      }
    } catch {}

    if (localData.length > 0) {
      setRowData(localData);
    } else {
      setRowData(SEED_DATA);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);

    try {
      const stored = localStorage.getItem('payagent_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRowData(parsed);
        }
      }
    } catch {}

    loadAndSyncOrders();
    const interval = setInterval(loadAndSyncOrders, 2500);

    const onOrderCreated = (event: any) => {
      if (event.detail && typeof window !== 'undefined') {
        const newOrder: PurchaseOrderDoc = event.detail;
        setRowData((prev) => {
          const updated = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
          localStorage.setItem('payagent_orders', JSON.stringify(updated));
          return updated;
        });
      }
      loadAndSyncOrders();
    };

    window.addEventListener('order-created', onOrderCreated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('order-created', onOrderCreated);
    };
  }, [loadAndSyncOrders, refreshTrigger]);

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
          {isMounted ? rowData.length : SEED_DATA.length} Records
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