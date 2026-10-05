"use client";

import Link from "next/link";
import { MapPin, Package, Star } from "lucide-react";
import { useProfile } from "@/api/profile";
import { useSignOut } from "@/api/auth";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { useAppRouter } from "@/lib/navigation";
import { ChangePassword } from "./settings/change-password";
import { ProfileDetails } from "./settings/profile-details";
import { InlineStatus } from "./settings/settings-card";
import { TwoFactorSettings } from "./settings/two-factor-settings";

const shortcuts = [
  { href: "/account/orders", label: "Your orders", icon: Package },
  { href: "/account/addresses", label: "Your addresses", icon: MapPin },
  { href: "/account/reviews", label: "Your reviews", icon: Star },
];

export function AccountClient() {
  const router = useAppRouter();
  const { endLocalSession } = useSignOut();
  const { data: profile, isPending, isError } = useProfile();

  async function afterPasswordChange(email: string) {
    await endLocalSession();
    const params = new URLSearchParams({
      email,
      reason: "password-changed",
      returnTo: "/account",
    });
    router.push(`/login?${params.toString()}`);
  }

  if (isPending) return <ListSkeleton rows={3} label="Loading your account" />;

  if (isError || !profile) {
    return (
      <InlineStatus tone="error">
        We could not load your account. Refresh the page to try again.
      </InlineStatus>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex min-w-0 flex-col gap-6">
        <ProfileDetails profile={profile} />
        <ChangePassword profile={profile} onChanged={afterPasswordChange} />
        <TwoFactorSettings accountEmail={profile.email} />
      </div>
      <nav
        aria-label="Account shortcuts"
        className="lg:sticky lg:top-24 lg:self-start"
      >
        <ul className="space-y-2">
          {shortcuts.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:border-foreground/20"
              >
                <item.icon
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
