import type { Metadata } from "next";
import { RequireCustomer } from "@/features/account/require-customer";
import { AccountReviews } from "@/features/reviews/account-reviews";

export const metadata: Metadata = { title: "Your reviews" };

export default function AccountReviewsPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Your reviews</h1>
      <RequireCustomer
        returnTo="/account/reviews"
        title="Sign in to see your reviews"
        description="Rate the things you have bought and manage what you wrote."
      >
        <AccountReviews />
      </RequireCustomer>
    </div>
  );
}
