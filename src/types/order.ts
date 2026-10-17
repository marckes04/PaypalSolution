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
  prompt: string;
  department: string;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paypalOrderId?: string;
  approvalLink?: string;
  items: OrderItem[];
  logs: AuditLog[];
  createdAt: string;
}