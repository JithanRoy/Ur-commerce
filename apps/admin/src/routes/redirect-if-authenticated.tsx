import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/stores/auth";

export function RedirectIfAuthenticated() {
  const session = useAuth((state) => state.session);
  const location = useLocation();

  if (session) {
    const from = (location.state as { from?: { pathname: string } } | null)
      ?.from?.pathname;
    return <Navigate to={from ?? "/products"} replace />;
  }

  return <Outlet />;
}
