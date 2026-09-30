import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOnline } from "@/lib/activity";
import { cn } from "@/lib/utils";

const RECONNECTED_VISIBLE_MS = 2500;

export function NetworkStatus() {
  const online = useOnline();
  const wasOffline = useRef(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setReconnected(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setReconnected(true);
    const timer = window.setTimeout(
      () => setReconnected(false),
      RECONNECTED_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [online]);

  if (online && !reconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4"
    >
      <p
        className={cn(
          "pointer-events-auto inline-flex animate-fade-in items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg",
          online
            ? "bg-success text-white"
            : "bg-foreground text-background",
        )}
      >
        {online ? (
          <>
            <Wifi className="size-4" aria-hidden />
            Back online
          </>
        ) : (
          <>
            <WifiOff className="size-4" aria-hidden />
            You're offline. Changes will fail until you reconnect.
          </>
        )}
      </p>
    </div>
  );
}
