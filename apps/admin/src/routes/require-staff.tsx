import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router";
import { isStaffRole } from "@urcommerce/api-client";
import { authApi } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useEffect } from "react";

export function RequireStaff() {
  const session = useAuth((state) => state.session);
  const setUser = useAuth((state) => state.setUser);
  const location = useLocation();

  const { data, isPending, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    enabled: Boolean(session),
    retry: false,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isError || !data || !isStaffRole(data.role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
