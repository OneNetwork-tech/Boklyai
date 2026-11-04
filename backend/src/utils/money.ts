/**
 * Money helpers. All amounts are integers in öre. Rounding uses "round half
 * away from zero", which matches how Swedish VAT is normally rounded per line.
 */

export const VAT_RATES = [25, 12, 6, 0] as const;
export type VatRate = (typeof VAT_RATES)[number];

export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** VAT on a net amount (öre) at a percentage rate. */
export function vatOnNet(netOre: number, rate: number): number {
  return roundHalfAwayFromZero((netOre * rate) / 100);
}

/** Split a VAT-inclusive gross amount into net + VAT. */
export function splitGross(grossOre: number, rate: number): { net: number; vat: number } {
  if (!rate) return { net: grossOre, vat: 0 };
  const vat = roundHalfAwayFromZero((grossOre * rate) / (100 + rate));
  return { net: grossOre - vat, vat };
}

/** Line net = quantity × unit price, rounded to öre. Quantity may have 3 decimals. */
export function lineNet(quantity: number, unitPriceOre: number): number {
  // Work in thousandths to avoid floating point error on quantities like 0.1.
  const qMilli = Math.round(quantity * 1000);
  return roundHalfAwayFromZero((qMilli * unitPriceOre) / 1000);
}

export function formatSek(ore: number): string {
  const sign = ore < 0 ? '-' : '';
  const abs = Math.abs(ore);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
