import type { Metadata } from "next";
import { OrderDetailClient } from "@/features/account/order-detail-client";
import { RequireCustomer } from "@/features/account/require-customer";

export const metadata: Metadata = { title: "Order" };

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <div className="container-page py-10">
      <RequireCustomer returnTo={`/account/orders/${orderId}`}>
        <OrderDetailClient orderId={orderId} />
      </RequireCustomer>
    </div>
  );
}
