"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  MapPin,
  Package,
  ShieldOff,
  Star,
  User,
  UserRound,
} from "lucide-react";
import type { Profile } from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";
import { useSignOut } from "@/api/auth";
import { useProfile } from "@/api/profile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppRouter } from "@/lib/navigation";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "@/lib/utils";

const links = [
  { href: "/account", label: "Your account", icon: UserRound },
  { href: "/account/orders", label: "Your orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/reviews", label: "Your reviews", icon: Star },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function Avatar({
  profile,
  size = "sm",
}: {
  profile: Profile | undefined;
  size?: "sm" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary",
        size === "sm" ? "size-7 text-[11px]" : "size-10 text-sm",
      )}
    >
      {profile ? initials(profile.name) : <User className="size-3.5" />}
    </span>
  );
}

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

function SignInLink() {
  const pathname = usePathname();
  const returnTo = pathname === "/login" ? "/" : pathname;
  return (
    <Button
      asChild
      variant="ghost"
      size="md"
      shape="pill"
      className="h-9 gap-2 px-2.5 text-muted-foreground hover:text-foreground"
    >
      <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
        <User className="size-[18px]" aria-hidden />
        <span className="hidden text-sm sm:inline">Sign in</span>
      </Link>
    </Button>
  );
}

function MenuHeader({ profile }: { profile: Profile | undefined }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3.5">
      <Avatar profile={profile} size="lg" />
      {profile ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{profile.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {profile.email}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      )}
    </div>
  );
}

function CompletionNudge({ profile }: { profile: Profile | undefined }) {
  if (!profile || profile.completion >= 100) return null;
  return (
    <Link
      href="/account"
      role="menuitem"
      className="mx-2 mt-2 block rounded-lg bg-muted/60 px-3 py-2.5 text-xs transition-colors hover:bg-muted"
    >
      <span className="flex items-center justify-between font-medium">
        Finish your profile
        <span className="tabular-nums text-muted-foreground">
          {profile.completion}%
        </span>
      </span>
      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-foreground/10">
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${profile.completion}%` }}
        />
      </span>
    </Link>
  );
}

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50";

export function AccountMenu() {
  const router = useAppRouter();
  const session = useAuth((state) => state.session);
  const { data: profile } = useProfile({ enabled: Boolean(session) });
  const { revokeThisDevice, revokeAllDevices, endLocalSession } = useSignOut();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, close, container);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!ready) {
    return <Skeleton className="h-9 w-9 rounded-full sm:w-24" />;
  }

  if (!session) {
    return (
      <>
        <SignInLink />
        {notice ? <SignedOutNotice message={notice} /> : null}
      </>
    );
  }

  async function clearLocalSession() {
    await endLocalSession();
    setOpen(false);
    setSigningOut(false);
    router.push("/");
    router.refresh();
  }

  async function onSignOut() {
    setSigningOut(true);
    await revokeThisDevice();
    await clearLocalSession();
  }

  async function onSignOutEverywhere() {
    const confirmed = window.confirm(
      "Sign out of every device where you are signed in?",
    );
    if (!confirmed) return;
    setSigningOut(true);
    const result = await revokeAllDevices();
    if (result) {
      const count = result.revokedSessions;
      setNotice(`Signed out of ${count} device${count === 1 ? "" : "s"}.`);
    }
    await clearLocalSession();
  }

  return (
    <div ref={container} className="relative">
      <Button
        variant="ghost"
        size="md"
        shape="pill"
        aria-label={profile ? `Your account, ${profile.name}` : "Your account"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "h-9 gap-2 pl-1 pr-2 text-foreground sm:pr-2.5",
          open && "bg-muted",
        )}
      >
        <Avatar profile={profile} />
        <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
          {profile ? `Hi, ${firstName(profile.name)}` : "Account"}
        </span>
        <ChevronDown
          className={cn(
            "hidden size-3.5 text-muted-foreground transition-transform sm:block",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-12 z-50 w-64 animate-fade-in overflow-hidden rounded-2xl border bg-background pb-2 shadow-xl"
        >
          <MenuHeader profile={profile} />
          <CompletionNudge profile={profile} />

          <div className="px-2 pt-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={close}
                className={menuItemClass}
              >
                <link.icon
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mx-2 my-2 border-t" />

          <div className="px-2">
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              disabled={signingOut}
              className={menuItemClass}
            >
              <LogOut className="size-4 text-muted-foreground" aria-hidden />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onSignOutEverywhere}
              disabled={signingOut}
              className={cn(menuItemClass, "text-muted-foreground")}
            >
              <ShieldOff className="size-4" aria-hidden />
              Sign out of all devices
            </button>
          </div>
        </div>
      ) : null}

      {notice ? <SignedOutNotice message={notice} /> : null}
    </div>
  );
}
