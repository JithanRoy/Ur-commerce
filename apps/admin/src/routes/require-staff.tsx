import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { isStaffRole } from "@urcommerce/api-client";
import { useCurrentUser } from "@/api/auth";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/stores/auth";

function VerifyingSession() {
  return (
    <div
      role="status"
      className="flex min-h-dvh animate-fade-in flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Spinner size="md" />
      <p className="text-sm">Checking your session…</p>
    </div>
  );
}

export function RequireStaff() {
  const session = useAuth((state) => state.session);
  const setUser = useAuth((state) => state.setUser);
  const signOut = useAuth((state) => state.signOut);
  const location = useLocation();

  const { data, isPending, isError } = useCurrentUser({
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  useEffect(() => {
    if (isError) signOut();
  }, [isError, signOut]);

  const redirectToLogin = (
    <Navigate to="/login" state={{ from: location }} replace />
  );

  if (!session) return redirectToLogin;
  if (isPending) {
    return isStaffRole(session.role) ? <Outlet /> : <VerifyingSession />;
  }
  if (isError || !data) return redirectToLogin;

  if (!isStaffRole(data.role)) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, reason: "not-staff" }}
        replace
      />
    );
  }

  return <Outlet />;
}
