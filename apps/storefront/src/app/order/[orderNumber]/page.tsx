import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-14">
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h1 className="mt-5 font-display text-3xl font-semibold">
          Thank you for your order
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your order{" "}
          <span className="font-medium text-foreground">{orderNumber}</span> has
          been placed. You will pay in cash when it arrives.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/account/orders"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            View your orders
          </Link>
          <Link
            href="/shop"
            className="inline-flex h-11 items-center rounded-full border px-6 text-sm font-medium"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
