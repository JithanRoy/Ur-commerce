import { isApiError } from "@urcommerce/api-client";
import { useProfile } from "@/api/profile";
import { useLogout } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/stores/auth";
import { ChangePassword } from "./settings/change-password";
import { ProfileDetails } from "./settings/profile-details";
import { TwoFactorSettings } from "./settings/two-factor-settings";

const TITLE = "Your account";
const DESCRIPTION = "Your details, password and sign-in security.";

export function AccountSettings() {
  const signOut = useAuth((state) => state.signOut);
  const logout = useLogout();
  const { data: profile, isPending, error } = useProfile();

  async function afterPasswordChange(email: string) {
    await logout().catch(() => null);
    signOut({ reason: "password-changed", email });
  }

  if (isPending) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <LoadingState variant="form" label="Loading your account" />
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <ErrorState
          message={
            isApiError(error)
              ? error.message
              : "We could not load your account."
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <div className="flex max-w-3xl flex-col gap-6">
        <TwoFactorSettings accountEmail={profile.email} />
        <ProfileDetails profile={profile} />
        <ChangePassword profile={profile} onChanged={afterPasswordChange} />
      </div>
    </>
  );
}
