import { Link, NavLink, Outlet } from "react-router";
import { Building2, LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

function SessionEnds({ expiresAt }: { expiresAt: number | null }) {
  if (!expiresAt) return null;
  return (
    <span className="hidden text-xs text-sidebar-muted md:inline">
      Session ends {timeFormat.format(new Date(expiresAt))}
    </span>
  );
}

export function ConsoleShell() {
  const session = useAuth((state) => state.session);
  const signOut = useAuth((state) => state.signOut);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/12">
              <Building2 className="size-4" aria-hidden />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold">Ur-commerce</span>
              <span className="block text-xs text-sidebar-muted">
                Platform console
              </span>
            </span>
          </Link>
          <nav aria-label="Console" className="flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/12 text-sidebar-foreground"
                    : "text-sidebar-muted hover:text-sidebar-foreground",
                )
              }
            >
              <Store className="size-4" aria-hidden />
              Stores
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <SessionEnds expiresAt={session?.expiresAt ?? null} />
            <span className="hidden max-w-48 truncate text-sm sm:inline">
              {session?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              leading={<LogOut aria-hidden />}
              onClick={() => signOut()}
              className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
