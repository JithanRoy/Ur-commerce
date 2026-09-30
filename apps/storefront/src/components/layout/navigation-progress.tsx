"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useActivityPending } from "@/lib/activity";
import { NAVIGATION_START_EVENT } from "@/lib/navigation";

const GIVE_UP_AFTER_MS = 20_000;

function navigatingAnchor(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const target = event.target instanceof Element ? event.target : null;
  const anchor = target?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }
  return anchor;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [navigating, setNavigating] = useState(false);
  const location = useRef(`${pathname}?${search}`);

  useEffect(() => {
    location.current = `${pathname}?${search}`;
    setNavigating(false);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => setNavigating(true);
    const onClick = (event: MouseEvent) => {
      if (navigatingAnchor(event)) start();
    };
    const onPopState = () => {
      const next = `${window.location.pathname}?${window.location.search.replace(/^\?/, "")}`;
      if (next !== location.current) start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(NAVIGATION_START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(NAVIGATION_START_EVENT, start);
    };
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const timer = window.setTimeout(
      () => setNavigating(false),
      GIVE_UP_AFTER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [navigating]);

  const mutating = useIsMutating();
  const activity = useActivityPending();

  return <ProgressBar active={navigating || mutating > 0 || activity} />;
}
