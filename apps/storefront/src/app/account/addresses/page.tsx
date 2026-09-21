import type { Metadata } from "next";
import { AddressesClient } from "@/features/account/addresses-client";
import { RequireCustomer } from "@/features/account/require-customer";

export const metadata: Metadata = { title: "Your addresses" };

export default function AccountAddressesPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">
        Your addresses
      </h1>
      <RequireCustomer
        returnTo="/account/addresses"
        title="Sign in to manage your addresses"
        description="Your saved addresses are tied to your account."
      >
        <AddressesClient />
      </RequireCustomer>
    </div>
  );
}
