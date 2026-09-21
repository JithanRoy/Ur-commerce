"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBDT, isApiError } from "@urcommerce/api-client";
import type { Address } from "@urcommerce/api-client";
import { checkoutApi } from "@/lib/browser-api";
import { useAuth } from "@/stores/auth";
import { useCart, cartQueryKey } from "@/features/cart/use-cart";
import { AddressForm, toCreateInput } from "@/features/account/address-form";
import type { AddressValues } from "@/features/account/address-form";
import { cn } from "@/lib/utils";

export function CheckoutClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuth((state) => state.session);
  const { data: cart, isPending: cartPending } = useCart();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => checkoutApi.addresses.list(),
    enabled: Boolean(session),
    retry: false,
  });

  useEffect(() => {
    if (addressId || !addresses?.length) return;
    const preferred = addresses.find((entry) => entry.isDefault) ?? addresses[0];
    if (preferred) setAddressId(preferred.id);
  }, [addresses, addressId]);

  const { data: quote } = useQuery({
    queryKey: ["checkout", "quote", addressId],
    queryFn: () => checkoutApi.quote(addressId as string),
    enabled: Boolean(addressId),
    retry: false,
  });

  const createAddress = useMutation({
    mutationFn: (values: AddressValues) =>
      checkoutApi.addresses.create({
        ...toCreateInput(values),
        isDefault: true,
      }),
    onSuccess: (address: Address) => {
      setAddressId(address.id);
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  const placeOrder = useMutation({
    mutationFn: () =>
      checkoutApi.place(addressId as string, "CASH_ON_DELIVERY"),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      router.push(`/order/${order.orderNumber}`);
    },
    onError: (error) => {
      if (isApiError(error) && error.isConflict) {
        setCheckoutError(
          "Something in your cart sold out while you were checking out. Your cart has been refreshed — please adjust it and try again.",
        );
        queryClient.invalidateQueries({ queryKey: cartQueryKey });
        return;
      }
      setCheckoutError(
        isApiError(error) ? error.message : "Could not place your order.",
      );
    },
  });

  if (!session) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-16 text-center">
        <p className="font-medium">Sign in to check out</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your cart is saved and will be waiting for you.
        </p>
        <Link
          href="/login?returnTo=/checkout"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (cartPending) return <p className="text-muted-foreground">Loading…</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-16 text-center">
        <p className="font-medium">Your cart is empty</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Continue shopping
        </Link>
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
              onSubmit={(values) => createAddress.mutate(values)}
            />
          ) : null}
        </section>

        <section>
          <h2 className="mb-4 font-medium">Payment</h2>
          <div className="rounded-lg border px-4 py-3">
            <label className="flex items-center gap-3 text-sm">
              <input type="radio" name="payment" defaultChecked readOnly />
              <span>
                <span className="font-medium">Cash on delivery</span>
                <span className="block text-muted-foreground">
                  Pay when your order arrives.
                </span>
              </span>
            </label>
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

        <button
          type="button"
          onClick={() => placeOrder.mutate()}
          disabled={!addressId || hasStockProblem || placeOrder.isPending}
          className="mt-6 h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {placeOrder.isPending ? "Placing order…" : "Place order"}
        </button>

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
