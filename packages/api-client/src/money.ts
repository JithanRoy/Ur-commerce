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

export function formatPriceRange(
  min: Paisa,
  max: Paisa,
  currency = "BDT",
): string {
  if (min === max) return formatBDT(min, currency);
  return `${formatBDT(min, currency)} – ${formatBDT(max, currency)}`;
}

export function takaToPaisa(taka: number): Paisa {
  return Math.round(taka * 100) as Paisa;
}

export function paisaToTakaInput(amount: Paisa): number {
  return amount / 100;
}
