import type { Metadata } from "next";
import { AccountClient } from "@/features/account/account-client";
import { RequireCustomer } from "@/features/account/require-customer";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Your account</h1>
      <RequireCustomer
        returnTo="/account"
        title="Sign in to manage your account"
        description="Your details and security settings are tied to your account."
      >
        <AccountClient />
      </RequireCustomer>
    </div>
  );
}
