// Money is handled as integer öre end to end. These helpers convert for display/input.

const sek = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 123456 → "1 234,56" (no currency suffix). */
export function money(ore: number | null | undefined): string {
  if (ore === null || ore === undefined) return '';
  return sek.format(ore / 100).replace(/−/g, '-');
}

/** 123456 → "1 234,56 kr" */
export function kr(ore: number | null | undefined): string {
  if (ore === null || ore === undefined) return '';
  return `${money(ore)} kr`;
}

/** Whole kronor for KPIs: 123456 → "1 235 kr" */
export function krRound(ore: number): string {
  return `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(Math.round(ore / 100)).replace(/−/g, '-')} kr`;
}

/** Parse "1 234,56", "1234.56", "-12" into öre; null when invalid. */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[\s ]/g, '').replace(/[−–]/g, '-').replace(/kr$/i, '').replace(',', '.');
  if (s === '') return null;
  if (!/^-?\d+(\.\d{0,2})?$/.test(s)) return null;
  const negative = s.startsWith('-');
  const [whole, frac = ''] = s.replace('-', '').split('.');
  const ore = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return negative ? -ore : ore;
}

/** öre → editable string "1234,56" */
export function moneyInput(ore: number | null | undefined): string {
  if (ore === null || ore === undefined) return '';
  const sign = ore < 0 ? '-' : '';
  const abs = Math.abs(ore);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

export function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date());
}

export function percent(n: number): string {
  return `${String(n).replace('.', ',')} %`;
}

export function dateTime(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export const vatRates = [25, 12, 6, 0] as const;
