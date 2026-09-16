import type { Metadata } from "next";
import { CartClient } from "@/features/cart/cart-client";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Your cart</h1>
      <CartClient />
    </div>
  );
}
