"use client";

import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { Cart, CartLine, Paisa } from "@urcommerce/api-client";
import { cartApi } from "@/lib/browser-api";

export const cartQueryKey = ["cart"];
const cartMutationKey = ["cart"];

function cartLineMutationKey(lineId: string) {
  return [...cartMutationKey, "line", lineId];
}

type CartSnapshot = { previous: Cart | undefined };

export function useCart() {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: () => cartApi.get(),
    retry: false,
  });
}

function withQuantity(line: CartLine, quantity: number): CartLine {
  return {
    ...line,
    quantity,
    lineTotal: (line.unitPrice * quantity) as Paisa,
    exceedsStock: quantity > line.variant.stock,
  };
}

function withLines(cart: Cart, items: CartLine[]): Cart {
  return {
    ...cart,
    items,
    itemCount: items.reduce((count, line) => count + line.quantity, 0),
    subtotal: items.reduce(
      (total, line) => total + line.lineTotal,
      0,
    ) as Paisa,
  };
}

function isOnlyPendingCartMutation(queryClient: QueryClient) {
  return queryClient.isMutating({ mutationKey: cartMutationKey }) <= 1;
}

function writeConfirmedCart(queryClient: QueryClient, cart: Cart) {
  if (isOnlyPendingCartMutation(queryClient)) {
    queryClient.setQueryData(cartQueryKey, cart);
  }
}

async function patchCart(
  queryClient: QueryClient,
  patch: (cart: Cart) => Cart,
): Promise<CartSnapshot> {
  await queryClient.cancelQueries({ queryKey: cartQueryKey });
  const previous = queryClient.getQueryData<Cart>(cartQueryKey);
  if (previous) queryClient.setQueryData(cartQueryKey, patch(previous));
  return { previous };
}

function rollBack(queryClient: QueryClient, snapshot: CartSnapshot | undefined) {
  if (snapshot?.previous && isOnlyPendingCartMutation(queryClient)) {
    queryClient.setQueryData(cartQueryKey, snapshot.previous);
  }
  void queryClient.invalidateQueries({ queryKey: cartQueryKey });
}

export function useCartMutations() {
  const queryClient = useQueryClient();

  return {
    addItem: useMutation({
      mutationKey: cartMutationKey,
      mutationFn: ({
        variantId,
        quantity,
      }: {
        variantId: string;
        quantity: number;
      }) => cartApi.addItem(variantId, quantity),
      onMutate: () => queryClient.cancelQueries({ queryKey: cartQueryKey }),
      onSuccess: (cart) => writeConfirmedCart(queryClient, cart),
      onError: () =>
        void queryClient.invalidateQueries({ queryKey: cartQueryKey }),
    }),
  };
}

export function useCartLineMutations(lineId: string) {
  const queryClient = useQueryClient();
  const mutationKey = cartLineMutationKey(lineId);
  const scope = { id: mutationKey.join(":") };

  const updateItem = useMutation<Cart, Error, number, CartSnapshot>({
    mutationKey,
    scope,
    mutationFn: (quantity) => cartApi.updateItem(lineId, quantity),
    onMutate: (quantity) =>
      patchCart(queryClient, (cart) =>
        withLines(
          cart,
          cart.items.map((line) =>
            line.id === lineId ? withQuantity(line, quantity) : line,
          ),
        ),
      ),
    onSuccess: (cart) => writeConfirmedCart(queryClient, cart),
    onError: (_error, _quantity, snapshot) => rollBack(queryClient, snapshot),
  });

  const removeItem = useMutation<Cart, Error, void, CartSnapshot>({
    mutationKey,
    scope,
    mutationFn: () => cartApi.removeItem(lineId),
    onMutate: () =>
      patchCart(queryClient, (cart) =>
        withLines(
          cart,
          cart.items.filter((line) => line.id !== lineId),
        ),
      ),
    onSuccess: (cart) => writeConfirmedCart(queryClient, cart),
    onError: (_error, _variables, snapshot) => rollBack(queryClient, snapshot),
  });

  const statuses = useMutationState({
    filters: { mutationKey, exact: true },
    select: (mutation) => mutation.state.status,
  });
  const latestStatus = statuses[statuses.length - 1];

  return {
    updateItem,
    removeItem,
    isRemoving: removeItem.isPending,
    lastAttemptFailed: latestStatus === "error",
  };
}
