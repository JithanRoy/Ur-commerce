import type { ApiClient } from "./client";
import type { UploadTicket } from "./admin/types";
import type { Paginated } from "./types";

export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;
export const REVIEW_TITLE_MAX_LENGTH = 120;
export const REVIEW_BODY_MAX_LENGTH = 2000;
export const REVIEW_MAX_IMAGES = 5;
export const REVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const REVIEW_SORTS = ["newest", "highest", "lowest"] as const;
export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type ReviewSort = (typeof REVIEW_SORTS)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type StarRating = 1 | 2 | 3 | 4 | 5;

export type RatingDistribution = Record<`${StarRating}`, number>;

export type RatingSummary = {
  average: number;
  count: number;
  distribution: RatingDistribution;
};

export type ReviewImage = { url: string; position: number };

export type OwnReviewImage = ReviewImage & { objectKey: string };

export type ReviewImageUploadInput = {
  contentType: string;
  contentLength: number;
};

export type PublicReview = {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  images: ReviewImage[];
};

export type ProductReviews = Paginated<PublicReview> & {
  summary: RatingSummary;
};

export type ProductReviewQuery = {
  page?: number;
  limit?: number;
  sort?: ReviewSort;
  rating?: number;
};

export type ReviewProductImage = { url: string; alt: string | null };

export type OwnReview = Omit<PublicReview, "images"> & {
  images: OwnReviewImage[];
  status: ReviewStatus;
  productId: string;
  product: { name: string; slug: string; images: ReviewProductImage[] };
};

export type ReviewIneligibility =
  "NOT_PURCHASED" | "ALREADY_REVIEWED" | "STAFF_ACCOUNT";

export type ReviewEligibility = {
  canReview: boolean;
  reason: ReviewIneligibility | null;
  review: OwnReview | null;
};

export type AwaitingReviewProduct = {
  id: string;
  name: string;
  slug: string;
  images: ReviewProductImage[];
};

export type ReviewSummary = {
  awaiting: number;
  written: number;
};

export type ReviewPrompt = {
  product: {
    id: string;
    name: string;
    slug: string;
    images: ReviewProductImage[];
  };
  order: { id: string; orderNumber: string; deliveredAt: string | null };
};

export type CreateReviewInput = {
  productId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  imageObjectKeys?: string[];
};

export type UpdateReviewInput = {
  rating?: number;
  title?: string | null;
  body?: string | null;
};

export type AdminReview = Omit<PublicReview, "images"> & {
  images: OwnReviewImage[];
  status: ReviewStatus;
  orderId: string;
  userId: string;
  product: { id: string; name: string; slug: string };
  user: { name: string; email: string };
};

export type AdminReviewQuery = {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  productId?: string;
  rating?: number;
};

export type ModerationDecision = Extract<ReviewStatus, "APPROVED" | "REJECTED">;

export function roundedRating(average: number): number {
  return Math.round(average * 10) / 10;
}

export function createReviewsApi(client: ApiClient) {
  return {
    forProduct: (slug: string, query: ProductReviewQuery = {}) =>
      client.get<ProductReviews>(`/products/${slug}/reviews`, { query }),
    eligibility: (productId: string) =>
      client.get<ReviewEligibility>(`/reviews/eligibility/${productId}`),
    awaiting: () => client.get<AwaitingReviewProduct[]>("/reviews/awaiting"),
    summary: () => client.get<ReviewSummary>("/reviews/summary"),
    prompt: () =>
      client
        .get<{ prompt: ReviewPrompt | null }>("/reviews/prompt")
        .then((result) => result.prompt),
    promptShown: (productId: string) =>
      client.post<unknown>(`/reviews/prompt/${productId}/shown`),
    dismissPrompt: (productId: string) =>
      client.post<unknown>(`/reviews/prompt/${productId}/dismiss`),
    mine: (query: { page?: number; limit?: number } = {}) =>
      client.get<Paginated<OwnReview>>("/reviews/mine", { query }),
    imageUpload: (input: ReviewImageUploadInput) =>
      client.post<UploadTicket>("/reviews/uploads", input),
    create: (input: CreateReviewInput) =>
      client.post<OwnReview>("/reviews", input),
    update: (id: string, input: UpdateReviewInput) =>
      client.patch<OwnReview>(`/reviews/${id}`, input),
    remove: (id: string) => client.delete<{ deleted: true }>(`/reviews/${id}`),
  };
}

export type ReviewsApi = ReturnType<typeof createReviewsApi>;
