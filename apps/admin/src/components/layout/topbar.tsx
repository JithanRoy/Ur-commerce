import { LogOut } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { authApi } from "@/lib/api";

export function Topbar() {
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
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6">
      <div className="ml-auto flex items-center gap-4">
        {user ? (
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === "TENANT_OWNER" ? "Owner" : "Staff"}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm transition-colors hover:bg-muted"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
