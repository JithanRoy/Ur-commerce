import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import { X } from "lucide-react";
import { Sidebar, SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";
import { IconButton } from "@/components/ui/button";
import { preloadAllRoutes } from "@/routes/lazy";
import { RouteFallback } from "./route-fallback";

const STORE_NAME = "Store admin";

export function AdminShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setNavOpen(false), [location.pathname]);

  useEffect(() => {
    const idle =
      window.requestIdleCallback ??
      ((run: () => void) => window.setTimeout(run, 1200));
    idle(preloadAllRoutes);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar storeName={STORE_NAME} />

      {navOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="relative h-full w-64 bg-sidebar">
            <IconButton
              size="icon-sm"
              onClick={() => setNavOpen(false)}
              label="Close navigation"
              className="absolute right-3 top-3.5 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <X aria-hidden />
            </IconButton>
            <SidebarContent storeName={STORE_NAME} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <Toaster position="top-right" richColors closeButton />
      </div>
    </div>
  );
}
