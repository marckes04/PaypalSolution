'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { PurchaseOrderDoc } from '@/types/order';

// Registrar módulos de AG Grid Community
ModuleRegistry.registerModules([AllCommunityModule]);

export default function OrdersAgGrid() {
  const [rowData, setRowData] = useState<PurchaseOrderDoc[]>([]);

  // Consultar la API del backend
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          setRowData(data.orders);
        }
      }
    } catch {
      // Ignorar fallos transitorios de red
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 2500);
    return () => clearInterval(interval);
  }, []);

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
            {params.value ? `${params.value.slice(0, 10)}...` : '-'}
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
              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <CheckCircle2 size={13} /> APPROVED
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
              <Clock size={13} /> PENDING
            </span>
          );
        },
      },
      {
        headerName: 'PayPal Reference',
        field: 'paypalOrderId',
        flex: 1.2,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-sky-400">
            {params.value || '-'}
          </span>
        ),
      },
      {
        headerName: 'HITL Action',
        field: 'approvalUrl',
        flex: 1.1,
        cellRenderer: (params: any) => {
          if (!params.value) {
            return <span className="text-zinc-600 text-xs">Automated STP</span>;
          }
          if (params.data?.status === 'APPROVED') {
            return <span className="text-emerald-500 text-xs">Completed</span>;
          }
          return (
            <a
              href={params.value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 underline font-medium"
            >
              Authorize <ExternalLink size={12} />
            </a>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Live Procurement Ledger</h2>
          <p className="text-xs text-zinc-500">Real-time AG Grid sync with PayPal Sandbox & Firestore</p>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-700/50">
          {rowData.length} Records
        </span>
      </div>
      <div className="flex-1 w-full ag-theme-quartz-dark">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={10}
        />
      </div>
    </div>
  );
}