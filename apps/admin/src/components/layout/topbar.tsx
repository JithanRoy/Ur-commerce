import { Link } from "react-router";
import { LogOut, Menu } from "lucide-react";
import { preloadRouteFor } from "@/routes/lazy";
import { useAuth } from "@/stores/auth";
import { useLogout } from "@/api/auth";
import { Button, IconButton } from "@/components/ui/button";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Topbar({ onOpenNav }: { onOpenNav?: () => void }) {
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const logout = useLogout();

  async function onSignOut() {
    try {
      await logout();
    } catch {
      // signing out locally is what matters
    }
    signOut();
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md sm:px-6">
      {onOpenNav ? (
        <IconButton
          onClick={onOpenNav}
          label="Open navigation"
          className="-ml-1 size-9 text-muted-foreground md:hidden"
        >
          <Menu className="size-4.5" aria-hidden />
        </IconButton>
      ) : null}

      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <Link
            to="/account"
            aria-label={`Your account: ${user.name}`}
            onMouseEnter={() => preloadRouteFor("/account")}
            onFocus={() => preloadRouteFor("/account")}
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
          >
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
            >
              {initials(user.name)}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === "TENANT_OWNER" ? "Owner" : "Staff"}
              </p>
            </div>
          </Link>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={onSignOut}
          leading={<LogOut aria-hidden />}
          className="h-9 gap-2"
        >
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
