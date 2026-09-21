import type { ApiClient } from "../client";
import type { Paginated } from "../types";
import type {
  Address,
  Cart,
  CheckoutQuote,
  CreateAddressInput,
  DeletedAddress,
  Order,
  PaymentMethod,
  UpdateAddressInput,
} from "./types";

export function createCartApi(client: ApiClient) {
  return {
    get: () => client.get<Cart>("/cart", { withCartSession: true }),
    addItem: (variantId: string, quantity: number) =>
      client.post<Cart>(
        "/cart/items",
        { variantId, quantity },
        { withCartSession: true },
      ),
    updateItem: (itemId: string, quantity: number) =>
      client.patch<Cart>(
        `/cart/items/${itemId}`,
        { quantity },
        { withCartSession: true },
      ),
    removeItem: (itemId: string) =>
      client.delete<Cart>(`/cart/items/${itemId}`, { withCartSession: true }),
    clear: () => client.delete<Cart>("/cart", { withCartSession: true }),
  };
}

export function createCheckoutApi(client: ApiClient) {
  return {
    addresses: {
      list: () => client.get<Address[]>("/addresses"),
      get: (id: string) => client.get<Address>(`/addresses/${id}`),
      create: (input: CreateAddressInput) =>
        client.post<Address>("/addresses", input),
      update: (id: string, input: UpdateAddressInput) =>
        client.patch<Address>(`/addresses/${id}`, input),
      remove: (id: string) => client.delete<DeletedAddress>(`/addresses/${id}`),
      setDefault: (id: string) =>
        client.put<Address>(`/addresses/${id}/default`),
    },
    quote: (addressId: string) =>
      client.post<CheckoutQuote>("/checkout/quote", { addressId }),
    place: (addressId: string, paymentMethod: PaymentMethod) =>
      client.post<Order>("/checkout", { addressId, paymentMethod }),
    orders: (query: { page?: number; limit?: number } = {}) =>
      client.get<Paginated<Order>>("/orders", { query }),
    order: (id: string) => client.get<Order>(`/orders/${id}`),
  };
}
