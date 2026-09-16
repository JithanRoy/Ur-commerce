import type { Metadata } from "next";
import { CheckoutClient } from "@/features/checkout/checkout-client";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Checkout</h1>
      <CheckoutClient />
    </div>
  );
}
