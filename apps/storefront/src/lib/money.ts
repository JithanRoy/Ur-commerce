export type Paisa = number & { readonly __brand: "paisa" };

export const paisa = (value: number): Paisa => value as Paisa;

export function formatBDT(amount: Paisa, currency = "BDT"): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
