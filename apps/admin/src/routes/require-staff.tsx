import { Navigate, Outlet, useLocation } from "react-router";
import { isStaffRole } from "@urcommerce/api-client";
import { useAuth } from "@/stores/auth";

export function RequireStaff() {
  const session = useAuth((state) => state.session);
  const location = useLocation();

  if (!session || !isStaffRole(session.role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
