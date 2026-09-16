import type { Metadata } from "next";
import { OrdersClient } from "@/features/account/orders-client";
import { RequireCustomer } from "@/features/account/require-customer";

export const metadata: Metadata = { title: "Your orders" };

export default function AccountOrdersPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Your orders</h1>
      <RequireCustomer returnTo="/account/orders">
        <OrdersClient />
      </RequireCustomer>
    </div>
  );
}
