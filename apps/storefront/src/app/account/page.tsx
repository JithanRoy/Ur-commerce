import type { Metadata } from "next";
import { AccountClient } from "@/features/account/account-client";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return <AccountClient />;
}
