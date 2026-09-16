"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";

export function RequireCustomer({
  children,
  returnTo,
}: {
  children: React.ReactNode;
  returnTo: string;
}) {
  const session = useAuth((state) => state.session);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  if (!ready) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-dashed px-8 py-16 text-center">
        <p className="font-medium">Sign in to see your orders</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your order history is tied to your account.
        </p>
        <Link
          href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
