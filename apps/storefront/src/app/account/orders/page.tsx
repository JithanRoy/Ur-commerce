import type { Metadata } from "next";
import { OrdersClient } from "@/features/account/orders-client";

export const metadata: Metadata = { title: "Your orders" };

export default function AccountOrdersPage() {
  return <OrdersClient />;
}
