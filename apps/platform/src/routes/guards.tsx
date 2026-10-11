import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { isSessionLive, useAuth } from "@/stores/auth";

function useSignOutAtExpiry() {
  const session = useAuth((state) => state.session);
  const signOut = useAuth((state) => state.signOut);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const remaining = session.expiresAt - Date.now();
    const timer = window.setTimeout(
      () => signOut("expired"),
      Math.max(remaining, 0),
    );
    return () => window.clearTimeout(timer);
  }, [session, signOut]);
}

export function RequireOwner() {
  const location = useLocation();
  const session = useAuth((state) => state.session);
  const signOut = useAuth((state) => state.signOut);
  const live = isSessionLive(session);
  useSignOutAtExpiry();

  useEffect(() => {
    if (session && !live) signOut("expired");
  }, [session, live, signOut]);

  if (!live) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RedirectIfSignedIn() {
  const session = useAuth((state) => state.session);
  if (isSessionLive(session)) return <Navigate to="/" replace />;
  return <Outlet />;
}
