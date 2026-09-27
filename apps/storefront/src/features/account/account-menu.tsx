"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, MapPin, Package, ShieldOff, User } from "lucide-react";
import { authApi } from "@/lib/browser-api";
import { useAuth } from "@/stores/auth";
import { clearCartSession } from "@/stores/cart-session";
import { cartQueryKey } from "@/features/cart/use-cart";

const links = [
  { href: "/account/orders", label: "Your orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
];

function SignedOutNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border bg-background px-4 py-2 text-sm shadow-lg"
    >
      {message}
    </p>
  );
}

export function AccountMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuth((state) => state.session);
  const signOut = useAuth((state) => state.signOut);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !session) {
    return (
      <>
        <Link
          href="/account/orders"
          aria-label="Your orders"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <User className="size-[18px]" />
        </Link>
        {notice ? <SignedOutNotice message={notice} /> : null}
      </>
    );
  }

  async function clearLocalSession() {
    signOut();
    clearCartSession();
    await queryClient.invalidateQueries({ queryKey: cartQueryKey });
    setOpen(false);
    setSigningOut(false);
    router.push("/");
    router.refresh();
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await authApi.logout();
    } catch {
      // signing out locally is what matters
    }
    await clearLocalSession();
  }

  async function onSignOutEverywhere() {
    const confirmed = window.confirm(
      "Sign out of every device where you are signed in?",
    );
    if (!confirmed) return;
    setSigningOut(true);
    try {
      const result = await authApi.logoutAll();
      const count = result.revokedSessions;
      setNotice(`Signed out of ${count} device${count === 1 ? "" : "s"}.`);
    } catch {
      // signing out locally is what matters
    }
    await clearLocalSession();
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-label="Your account"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <User className="size-[18px]" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border bg-background py-1.5 shadow-lg"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-muted"
            >
              <link.icon className="size-4 text-muted-foreground" aria-hidden />
              {link.label}
            </Link>
          ))}

          <div className="my-1.5 border-t" />

          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <LogOut className="size-4 text-muted-foreground" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={onSignOutEverywhere}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <ShieldOff className="size-4 text-muted-foreground" aria-hidden />
            Sign out of all devices
          </button>
        </div>
      ) : null}
    </div>
  );
}
