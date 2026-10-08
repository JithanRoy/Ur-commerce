"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addressListQuery } from "./addresses";
import { orderListQuery } from "./orders";
import { profileQuery } from "./profile";
import {
  awaitingReviewsQuery,
  myReviewsQuery,
  reviewSummaryQuery,
} from "./reviews";

export function usePrefetchAccountData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchAll = () => {
      void queryClient.prefetchQuery(profileQuery());
      void queryClient.prefetchQuery(orderListQuery());
      void queryClient.prefetchQuery(addressListQuery());
      void queryClient.prefetchQuery(awaitingReviewsQuery());
      void queryClient.prefetchQuery(myReviewsQuery());
      void queryClient.prefetchQuery(reviewSummaryQuery());
    };
    if (typeof window.requestIdleCallback !== "function") {
      const timer = window.setTimeout(prefetchAll, 200);
      return () => window.clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(prefetchAll, { timeout: 1500 });
    return () => window.cancelIdleCallback(handle);
  }, [queryClient]);
}
