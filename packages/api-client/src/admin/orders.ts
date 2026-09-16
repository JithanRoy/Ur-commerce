import type { Paisa } from "../money";
import type { OrderStatus, ShippingAddressSnapshot } from "../cart/types";

export type { OrderStatus };

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  grandTotal: Paisa;
  currency: string;
  placedAt: string;
  _count: { items: number };
};

export type AdminOrderItem = {
  id: string;
  productName: string;
  variantSku: string;
  optionSummary: string | null;
  unitPrice: Paisa;
  compareAtPrice: Paisa | null;
  quantity: number;
  lineTotal: Paisa;
  productId: string | null;
  variantId: string | null;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  subtotal: Paisa;
  discountTotal: Paisa;
  shippingTotal: Paisa;
  grandTotal: Paisa;
  currency: string;
  placedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  items: AdminOrderItem[];
  shippingAddress: ShippingAddressSnapshot;
};

export type OrderCounts = Record<OrderStatus, number>;

export type AdminOrderQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: string;
  paymentMethod?: string;
  search?: string;
};

export type ChangeOrderStatusInput = {
  status: OrderStatus;
  adminNote?: string;
  cancelReason?: string;
};

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function nextStatuses(current: OrderStatus): OrderStatus[] {
  return NEXT_STATUSES[current] ?? [];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
