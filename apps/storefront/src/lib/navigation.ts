"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

export const NAVIGATION_START_EVENT = "app:navigation-start";

function targetsCurrentPage(href: string): boolean {
  const url = new URL(href, window.location.href);
  return (
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
}

export function announceNavigation(href: string) {
  if (targetsCurrentPage(href)) return;
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}

export function useAppRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        announceNavigation(href);
        router.push(href, options);
      },
      replace: (
        href: string,
        options?: Parameters<typeof router.replace>[1],
      ) => {
        announceNavigation(href);
        router.replace(href, options);
      },
    }),
    [router],
  );
}
