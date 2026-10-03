import { Link, useLocation } from "react-router";
import { ShieldAlert } from "lucide-react";
import { useTwoFactorStatus } from "@/api/profile";

export function TwoFactorReminder() {
  const location = useLocation();
  const { data: status } = useTwoFactorStatus();

  if (!status?.required || status.enabled) return null;
  if (location.pathname === "/account") return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm sm:px-6"
    >
      <ShieldAlert className="size-4 shrink-0 text-warning" aria-hidden />
      <span className="flex-1">
        Store owners need two-step verification. It takes a minute and stops a
        stolen password from opening your store.
      </span>
      <Link
        to="/account"
        className="font-medium underline underline-offset-4 hover:no-underline"
      >
        Set it up
      </Link>
    </div>
  );
}
