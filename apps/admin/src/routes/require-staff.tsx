import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router";
import { isStaffRole } from "@urcommerce/api-client";
import { authApi } from "@/lib/api";
import { useAuth } from "@/stores/auth";

function VerifyingSession() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-muted-foreground">Checking your session…</p>
    </div>
  );
}

export function RequireStaff() {
  const session = useAuth((state) => state.session);
  const setUser = useAuth((state) => state.setUser);
  const signOut = useAuth((state) => state.signOut);
  const location = useLocation();

  const { data, isPending, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    enabled: Boolean(session),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
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
  if (isPending) return <VerifyingSession />;
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
