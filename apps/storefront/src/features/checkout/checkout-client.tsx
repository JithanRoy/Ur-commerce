"use client";

import { useEffect, useState } from "react";
import { useAppRouter } from "@/lib/navigation";
import Link from "next/link";
import { formatBDT, isApiError } from "@urcommerce/api-client";
import type { PaymentMethod } from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";
import { useCart } from "@/api/cart";
import { useAddresses, useCreateAddress } from "@/api/addresses";
import { useCheckoutQuote, usePlaceOrder } from "@/api/checkout";
import { apiErrorMessage } from "@/api/use-api-mutation";
import { AddressForm, toCreateInput } from "@/features/account/address-form";
import { Radio } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckoutSkeleton } from "@/components/ui/page-skeletons";

type PaymentOption = {
  value: PaymentMethod;
  label: string;
  description: string;
};

const paymentOptions: [PaymentOption, ...PaymentOption[]] = [
  {
    value: "CASH_ON_DELIVERY",
    label: "Cash on delivery",
    description: "Pay when your order arrives.",
  },
];

const SOLD_OUT_DURING_CHECKOUT =
  "Something in your cart sold out while you were checking out. Your cart has been refreshed — please adjust it and try again.";

function placeOrderErrorMessage(error: unknown): string {
  if (isApiError(error) && error.isConflict) return SOLD_OUT_DURING_CHECKOUT;
  return apiErrorMessage(error, "Could not place your order.");
}

export function CheckoutClient() {
  const router = useAppRouter();
  const session = useAuth((state) => state.session);
  const { data: cart, isPending: cartPending } = useCart();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    paymentOptions[0].value,
  );

  const { data: addresses } = useAddresses({ enabled: Boolean(session) });

  useEffect(() => {
    if (addressId || !addresses?.length) return;
    const preferred = addresses.find((entry) => entry.isDefault) ?? addresses[0];
    if (preferred) setAddressId(preferred.id);
  }, [addresses, addressId]);

  const { data: quote } = useCheckoutQuote(addressId);

  const createAddress = useCreateAddress({
    onSuccess: (address) => setAddressId(address.id),
  });

  const placeOrder = usePlaceOrder({
    onSuccess: (order) => router.push(`/order/${order.orderNumber}`),
    onError: (error) => setCheckoutError(placeOrderErrorMessage(error)),
  });

  if (!session) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-16 text-center">
        <p className="font-medium">Sign in to check out</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your cart is saved and will be waiting for you.
        </p>
        <Button asChild shape="pill" className="mt-6 px-6">
          <Link href="/login?returnTo=/checkout">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (cartPending) return <CheckoutSkeleton />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-16 text-center">
        <p className="font-medium">Your cart is empty</p>
        <Button asChild shape="pill" className="mt-6 px-6">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const hasStockProblem = cart.items.some((line) => line.exceedsStock);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <section>
          <h2 className="mb-4 font-medium">Delivery address</h2>

          {addresses && addresses.length > 0 ? (
            <ul className="mb-6 space-y-3">
              {addresses.map((address) => (
                <li key={address.id}>
                  <button
                    type="button"
                    onClick={() => setAddressId(address.id)}
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                      addressId === address.id
                        ? "border-foreground bg-accent/40"
                        : "hover:border-foreground/30",
                    )}
                  >
                    <span className="font-medium">{address.fullName}</span>
                    <span className="block text-muted-foreground">
                      {address.addressLine}, {address.thana}, {address.district}
                    </span>
                    <span className="block text-muted-foreground">
                      {address.phone}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {addresses && addresses.length > 0 ? (
            <Link
              href="/account/addresses"
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Manage addresses
            </Link>
          ) : null}

          {!addresses || addresses.length === 0 ? (
            <AddressForm
              submitLabel="Save address"
              pending={createAddress.isPending}
              showOptionalFields={false}
              onSubmit={(values) =>
                createAddress.mutate({ ...toCreateInput(values), isDefault: true })
              }
            />
          ) : null}
        </section>

        <section>
          <h2 className="mb-4 font-medium">Payment</h2>
          <div className="space-y-3">
            {paymentOptions.map((option) => (
              <div key={option.value} className="rounded-lg border px-4 py-3">
                <Radio
                  name="payment"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  label={<span className="font-medium">{option.label}</span>}
                  description={
                    <span className="text-sm">{option.description}</span>
                  }
                  containerClassName="flex items-center gap-3"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-xl border p-6">
        <h2 className="font-medium">Order summary</h2>

        <ul className="mt-4 space-y-3 border-b pb-4">
          {cart.items.map((line) => (
            <li key={line.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{line.product.name}</span>
                <span className="text-muted-foreground">
                  {line.variant.options.map((o) => o.value).join(" · ")} ×{" "}
                  {line.quantity}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatBDT(line.lineTotal, line.currency)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">
              {formatBDT(cart.subtotal, cart.currency)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="tabular-nums">
              {quote ? formatBDT(quote.shippingTotal, quote.currency) : "—"}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {quote
                ? formatBDT(quote.grandTotal, quote.currency)
                : formatBDT(cart.subtotal, cart.currency)}
            </dd>
          </div>
        </dl>

        {checkoutError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {checkoutError}
          </p>
        ) : null}

        <Button
          fullWidth
          onClick={() => {
            if (addressId) placeOrder.mutate({ addressId, paymentMethod });
          }}
          disabled={!addressId || hasStockProblem}
          loading={placeOrder.isPending}
          loadingText="Placing order…"
          className="mt-6 disabled:opacity-40"
        >
          Place order
        </Button>

        {hasStockProblem ? (
          <p className="mt-2 text-center text-xs text-destructive">
            <Link href="/cart" className="underline">
              Adjust your cart
            </Link>{" "}
            to continue.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
