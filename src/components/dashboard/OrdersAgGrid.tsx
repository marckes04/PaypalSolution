'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  ModuleRegistry, 
  AllCommunityModule,
  ValidationModule 
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { subscribeToOrders } from '@/lib/firebase/ordersService';
import { PurchaseOrderDoc } from '@/types/order';
import { CheckCircle2, Clock, ExternalLink } from 'lucide-react';

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
      // Ignore background fetch errors
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToOrders((orders) => {
      if (orders && orders.length > 0) {
        setRowData(orders);
      }
    });

    fetchOrders();
    const interval = setInterval(fetchOrders, 2500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const columnDefs = useMemo<ColDef<PurchaseOrderDoc>[]>(
    () => [
      {
        headerName: 'Order ID',
        field: 'id',
        flex: 1,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-sky-400">{params.value || 'N/A'}</span>
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
        valueFormatter: (params) => (params.value ? `$${Number(params.value).toFixed(2)} USD` : '$0.00 USD'),
      },
      {
        headerName: 'Status',
        field: 'status',
        flex: 1,
        cellRenderer: (params: any) => {
          const isApproved = params.value === 'APPROVED';
          return (
            <div className="flex items-center gap-1.5 h-full">
              {isApproved ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> APPROVED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
                  <Clock className="w-3 h-3" /> PENDING_APPROVAL
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'PayPal Reference',
        field: 'paypalOrderId',
        flex: 1.2,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-zinc-400">{params.value || 'Pending'}</span>
        ),
      },
      {
        headerName: 'HITL Action',
        field: 'approvalLink',
        flex: 1,
        cellRenderer: (params: any) => {
          if (!params.value) return <span className="text-zinc-600 text-xs">Auto-cleared</span>;
          return (
            <a
              href={params.value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 underline"
            >
              Review in PayPal <ExternalLink className="w-3 h-3" />
            </a>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/60 backdrop-blur">
        <div>
          <h2 className="font-semibold text-zinc-100">Live Procurement Ledger</h2>
          <p className="text-xs text-zinc-500">Real-time AG Grid sync with PayPal Sandbox & Firestore</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
          {rowData.length} Records
        </span>
      </div>

      <div className="flex-1 w-full ag-theme-alpine-dark">
        <AgGridReact
          theme="legacy"
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
        />
      </div>
    </div>
  );
}