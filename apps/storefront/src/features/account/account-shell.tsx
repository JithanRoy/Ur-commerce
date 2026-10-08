"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePrefetchAccountData } from "@/api/account";
import { AccountNav } from "./account-nav";
import { RequireCustomer } from "./require-customer";

type AccountSection = {
  title: string | null;
  signInTitle: string;
  signInDescription: string;
};

const sections: Record<string, AccountSection> = {
  "/account": {
    title: "Your account",
    signInTitle: "Sign in to manage your account",
    signInDescription:
      "Your details and security settings are tied to your account.",
  },
  "/account/orders": {
    title: "Your orders",
    signInTitle: "Sign in to see your orders",
    signInDescription: "Your order history is tied to your account.",
  },
  "/account/addresses": {
    title: "Your addresses",
    signInTitle: "Sign in to manage your addresses",
    signInDescription: "Your saved addresses are tied to your account.",
  },
  "/account/reviews": {
    title: "Your reviews",
    signInTitle: "Sign in to see your reviews",
    signInDescription:
      "Rate the things you have bought and see what you wrote.",
  },
};

const orderDetail: AccountSection = {
  title: null,
  signInTitle: "Sign in to see this order",
  signInDescription: "Your order history is tied to your account.",
};

function sectionFor(pathname: string): AccountSection {
  return sections[pathname] ?? orderDetail;
}

function SignedInArea({ children }: { children: ReactNode }) {
  usePrefetchAccountData();
  return (
    <>
      <AccountNav />
      {children}
    </>
  );
}

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = sectionFor(pathname);

  return (
    <>
      {section.title ? (
        <h1 className="mb-5 font-display text-3xl font-semibold">
          {section.title}
        </h1>
      ) : null}
      <RequireCustomer
        returnTo={pathname}
        title={section.signInTitle}
        description={section.signInDescription}
      >
        <SignedInArea>{children}</SignedInArea>
      </RequireCustomer>
    </>
  );
}
