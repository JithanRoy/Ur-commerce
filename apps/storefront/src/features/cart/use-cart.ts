"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "@/lib/browser-api";

export const cartQueryKey = ["cart"];

export function useCart() {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: () => cartApi.get(),
    retry: false,
  });
}

export function useCartMutations() {
  const queryClient = useQueryClient();
  const onSettled = () =>
    queryClient.invalidateQueries({ queryKey: cartQueryKey });

  return {
    addItem: useMutation({
      mutationFn: ({
        variantId,
        quantity,
      }: {
        variantId: string;
        quantity: number;
      }) => cartApi.addItem(variantId, quantity),
      onSettled,
    }),
    updateItem: useMutation({
      mutationFn: ({
        itemId,
        quantity,
      }: {
        itemId: string;
        quantity: number;
      }) => cartApi.updateItem(itemId, quantity),
      onSettled,
    }),
    removeItem: useMutation({
      mutationFn: (itemId: string) => cartApi.removeItem(itemId),
      onSettled,
    }),
  };
}
