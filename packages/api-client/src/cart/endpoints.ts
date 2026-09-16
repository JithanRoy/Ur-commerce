import type { ApiClient } from "../client";
import type {
  Address,
  Cart,
  CheckoutQuote,
  CreateAddressInput,
  Order,
  PaymentMethod,
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
      create: (input: CreateAddressInput) =>
        client.post<Address>("/addresses", input),
    },
    quote: (addressId: string) =>
      client.post<CheckoutQuote>("/checkout/quote", { addressId }),
    place: (addressId: string, paymentMethod: PaymentMethod) =>
      client.post<Order>("/checkout", { addressId, paymentMethod }),
    orders: () => client.get<{ items: Order[] }>("/orders"),
  };
}
