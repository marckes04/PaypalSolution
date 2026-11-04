export type OrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'FAILED' | 'REJECTED';

export interface OrderItem {
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface AuditLog {
  timestamp: string;
  agentStep: string;
  detail: string;
}

export interface PurchaseOrderDoc {
  id?: string;
  prompt?: string;
  department: string;
  totalAmount: number;
  currency?: string;
  status: OrderStatus;
  paypalOrderId?: string | null;
  approvalLink?: string | null;
  approvalUrl?: string | null; // <--- Agrega esta línea
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  logs?: Array<{
    timestamp: string;
    agentStep: string;
    detail: string;
  }>;
  createdAt: string;
}