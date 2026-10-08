import type { Metadata } from "next";
import { AddressesClient } from "@/features/account/addresses-client";

export const metadata: Metadata = { title: "Your addresses" };

export default function AccountAddressesPage() {
  return <AddressesClient />;
}
