import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <Button asChild shape="pill" className="px-6">
            <Link href="/account/orders">View your orders</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            shape="pill"
            className="px-6 shadow-none"
          >
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
