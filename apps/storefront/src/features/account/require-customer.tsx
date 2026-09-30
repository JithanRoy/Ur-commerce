"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";

export function RequireCustomer({
  children,
  returnTo,
  title = "Sign in to see your orders",
  description = "Your order history is tied to your account.",
}: {
  children: React.ReactNode;
  returnTo: string;
  title?: string;
  description?: string;
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
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <Button asChild shape="pill" className="mt-6 px-6">
          <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
