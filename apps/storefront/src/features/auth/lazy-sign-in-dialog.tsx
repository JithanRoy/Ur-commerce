"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { SignInDialog } from "./sign-in-dialog";

type SignInDialogProps = ComponentProps<typeof SignInDialog>;

const loadSignInDialog = () =>
  import("./sign-in-dialog").then((module) => module.SignInDialog);

export function preloadSignInDialog() {
  void loadSignInDialog();
}

const DeferredSignInDialog = dynamic(loadSignInDialog, { ssr: false });

export function LazySignInDialog(props: SignInDialogProps) {
  if (!props.open) return null;
  return <DeferredSignInDialog {...props} />;
}
