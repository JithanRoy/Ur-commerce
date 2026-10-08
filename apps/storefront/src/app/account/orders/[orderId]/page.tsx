import type { Metadata } from "next";
import { OrderDetailClient } from "@/features/account/order-detail-client";

export const metadata: Metadata = { title: "Order" };

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailClient orderId={orderId} />;
}
