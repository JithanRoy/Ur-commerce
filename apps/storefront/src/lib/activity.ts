"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function beginActivity(): () => void {
  pending += 1;
  emit();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    pending = Math.max(0, pending - 1);
    emit();
  };
}

export function useActivityPending(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => pending > 0,
    () => false,
  );
}

export function useTrackActivity(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return beginActivity();
  }, [active]);
}

export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return shown;
}

function readOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, readOnline, () => true);
}
