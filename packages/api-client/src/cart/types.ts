import type { Paisa } from "../money";

export type CartLineOption = {
  name: string;
  value: string;
};

export type CartLineVariant = {
  id: string;
  sku: string;
  price: Paisa;
  compareAtPrice: Paisa | null;
  stock: number;
  options: CartLineOption[];
};

export type CartLineProduct = {
  id: string;
  name: string;
  slug: string;
  image: { url: string; alt: string | null } | null;
};

export type CartLine = {
  id: string;
  quantity: number;
  unitPrice: Paisa;
  lineTotal: Paisa;
  currency: string;
  exceedsStock: boolean;
  variant: CartLineVariant;
  product: CartLineProduct;
};

export type Cart = {
  id: string;
  items: CartLine[];
  itemCount: number;
  subtotal: Paisa;
  currency: string;
  updatedAt: string;
};

export type Address = {
  id: string;
  fullName: string;
  phone: string;
  alternatePhone: string | null;
  division: string;
  district: string;
  thana: string;
  area: string | null;
  addressLine: string;
  postCode: string | null;
  landmark: string | null;
  label: string | null;
  isDefault: boolean;
};

export type CreateAddressInput = {
  fullName: string;
  phone: string;
  division: string;
  district: string;
  thana: string;
  addressLine: string;
  alternatePhone?: string;
  area?: string;
  postCode?: string;
  landmark?: string;
  label?: string;
  isDefault?: boolean;
};

export type CheckoutQuote = {
  subtotal: Paisa;
  shippingTotal: Paisa;
  discountTotal: Paisa;
  grandTotal: Paisa;
  currency: string;
  itemCount: number;
};

export type PaymentMethod = "CASH_ON_DELIVERY";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type ShippingAddressSnapshot = {
  fullName: string;
  phone: string;
  alternatePhone: string | null;
  division: string;
  district: string;
  thana: string;
  area: string | null;
  addressLine: string;
  postCode: string | null;
  landmark: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  subtotal: Paisa;
  discountTotal: Paisa;
  shippingTotal: Paisa;
  grandTotal: Paisa;
  currency: string;
  placedAt: string;
  shippingAddress: ShippingAddressSnapshot;
};
