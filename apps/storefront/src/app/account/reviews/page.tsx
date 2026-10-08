import type { Metadata } from "next";
import { AccountReviews } from "@/features/reviews/account-reviews";

export const metadata: Metadata = { title: "Your reviews" };

export default function AccountReviewsPage() {
  return <AccountReviews />;
}
