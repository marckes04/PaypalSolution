'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { PurchaseOrderDoc } from '@/types/order';

// Registrar módulos de AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

export default function OrdersAgGrid() {
  const [rowData, setRowData] = useState<PurchaseOrderDoc[]>([]);

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
      // Ignorar fallos de red silenciosamente
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
        cellClass: 'text-zinc-300 flex items-center',
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
          <span className="font-mono text-xs text-zinc-400 flex items-center h-full">
            {params.value ? `${params.value.slice(0, 11)}...` : '-'}
          </span>
        ),
      },
      {
        headerName: 'Department',
        field: 'department',
        flex: 1,
        cellClass: 'text-zinc-300 flex items-center',
      },
      {
        headerName: 'Total Amount',
        field: 'totalAmount',
        flex: 1,
        cellClass: 'font-semibold text-zinc-100 flex items-center',
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
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium h-full">
                <CheckCircle2 size={13} /> APPROVED
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-medium h-full">
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
          if (!params.value) return <span className="text-zinc-600 flex items-center h-full">-</span>;
          return (
            <a
              href={`https://www.sandbox.paypal.com/checkoutnow?token=${params.value}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1 h-full"
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
            return <span className="text-emerald-500/80 text-xs flex items-center h-full">Authorized</span>;
          }

          // Resolver enlace si viene directo o construirlo con el token de PayPal
          const url =
            order?.approvalUrl ||
            (order?.paypalOrderId ? `https://www.sandbox.paypal.com/checkoutnow?token=${order.paypalOrderId}` : null);

          if (url && order?.status === 'PENDING_APPROVAL') {
            return (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 underline h-full"
              >
                Authorize <ExternalLink size={12} />
              </a>
            );
          }

          return <span className="text-zinc-600 text-xs flex items-center h-full">Automated STP</span>;
        },
      },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Live Procurement Ledger</h2>
          <p className="text-xs text-zinc-500">Real-time AG Grid sync with PayPal Sandbox & Firestore</p>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/50">
          {rowData.length} Records
        </span>
      </div>

      {/* Contenedor con tema oscuro forzado para AG Grid */}
      <div className="flex-1 w-full bg-zinc-950 ag-theme-quartz-dark text-zinc-200">
        <style jsx global>{`
          .ag-theme-quartz-dark {
            --ag-background-color: #09090b !important;
            --ag-header-background-color: #18181b !important;
            --ag-odd-row-background-color: #0d0d10 !important;
            --ag-border-color: #27272a !important;
            --ag-row-hover-color: #27272a !important;
            --ag-foreground-color: #f4f4f5 !important;
            --ag-header-foreground-color: #a1a1aa !important;
          }
          .ag-root-wrapper {
            background-color: #09090b !important;
            border: none !important;
          }
        `}</style>
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