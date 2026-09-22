import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { authApi } from "@/lib/api";

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

  async function onSignOut() {
    try {
      await authApi.logout();
    } catch {
      // signing out locally is what matters
    }
    signOut();
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-sm sm:px-6">
      {onOpenNav ? (
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="-ml-1 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <Menu className="size-4.5" aria-hidden />
        </button>
      ) : null}

      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium"
            >
              {initials(user.name)}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === "TENANT_OWNER" ? "Owner" : "Staff"}
              </p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm transition-colors hover:bg-muted"
        >
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
