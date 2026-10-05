"use client";

import { useProfile } from "@/api/profile";
import { useSignOut } from "@/api/auth";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { useAppRouter } from "@/lib/navigation";
import { ChangePassword } from "./settings/change-password";
import { ProfileDetails } from "./settings/profile-details";
import { InlineStatus } from "./settings/settings-card";
import { TwoFactorSettings } from "./settings/two-factor-settings";
import { ReviewsNudge } from "@/features/reviews/reviews-nudge";

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
    <div className="max-w-3xl">
      <ReviewsNudge />
      <div className="flex flex-col gap-6">
        <ProfileDetails profile={profile} />
        <ChangePassword profile={profile} onChanged={afterPasswordChange} />
        <TwoFactorSettings accountEmail={profile.email} />
      </div>
    </div>
  );
}
