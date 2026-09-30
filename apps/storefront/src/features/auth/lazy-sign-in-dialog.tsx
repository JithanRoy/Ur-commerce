"use client";

import { useEffect, useState, type ComponentProps } from "react";
import type { SignInDialog as SignInDialogComponent } from "./sign-in-dialog";

type SignInDialogType = typeof SignInDialogComponent;
type SignInDialogProps = ComponentProps<SignInDialogType>;

let loadedDialog: SignInDialogType | null = null;
let pendingLoad: Promise<SignInDialogType> | null = null;

function loadSignInDialog(): Promise<SignInDialogType> {
  pendingLoad ??= import("./sign-in-dialog").then((module) => {
    loadedDialog = module.SignInDialog;
    return module.SignInDialog;
  });
  return pendingLoad;
}

export function preloadSignInDialog() {
  void loadSignInDialog().catch(() => {
    pendingLoad = null;
  });
}

let idleWarmupScheduled = false;

function whenPageSettles(run: () => void) {
  const schedule = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 5000 });
    } else {
      setTimeout(run, 2000);
    }
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

export function useIdleSignInWarmup(enabled: boolean) {
  useEffect(() => {
    if (!enabled || idleWarmupScheduled || loadedDialog) return;
    idleWarmupScheduled = true;
    whenPageSettles(preloadSignInDialog);
  }, [enabled]);
}

export function LazySignInDialog(props: SignInDialogProps) {
  const [, setLoaded] = useState(false);
  const Dialog = loadedDialog;
  const { open, onClose } = props;

  useEffect(() => {
    if (!open || Dialog) return;
    let active = true;
    loadSignInDialog()
      .then(() => {
        if (active) setLoaded(true);
      })
      .catch(() => {
        pendingLoad = null;
        if (active) onClose();
      });
    return () => {
      active = false;
    };
  }, [open, onClose, Dialog]);

  if (!open || !Dialog) return null;
  return <Dialog {...props} />;
}
