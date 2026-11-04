/** Swedish identifiers: Luhn (mod 10), personnummer, organisationsnummer, OCR. */

export function luhnChecksumDigit(digits: string): number {
  // Compute the check digit for `digits` (payload without check digit).
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

export function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  return luhnChecksumDigit(digits.slice(0, -1)) === Number(digits[digits.length - 1]);
}

/**
 * Normalise an organisationsnummer to "NNNNNN-NNNN". Accepts 10 digits (with or
 * without hyphen) or 12 digits with the "16" prefix. Sole traders use their
 * personnummer, which is also accepted.
 */
export function normalizeOrgNumber(input: string): string | null {
  const digits = String(input).replace(/[\s-]/g, '');
  let ten = digits;
  if (/^\d{12}$/.test(digits)) ten = digits.slice(2);
  if (!/^\d{10}$/.test(ten) || !luhnValid(ten)) return null;
  return `${ten.slice(0, 6)}-${ten.slice(6)}`;
}

/**
 * Normalise a personnummer to "YYYYMMDD-NNNN". 10-digit input infers the
 * century ('+' separator means 100+ years old). Samordningsnummer (day + 60)
 * are accepted.
 */
export function normalizePersonalNumber(input: string, today = new Date()): string | null {
  const raw = String(input).trim();
  const plus = raw.includes('+');
  const digits = raw.replace(/[\s+-]/g, '');
  let full: string;
  if (/^\d{12}$/.test(digits)) {
    full = digits;
  } else if (/^\d{10}$/.test(digits)) {
    const yy = Number(digits.slice(0, 2));
    const currentYear = today.getFullYear();
    let century = Math.floor(currentYear / 100) * 100;
    if (century + yy > currentYear) century -= 100;
    if (plus) century -= 100;
    full = `${century + yy}${digits.slice(2)}`;
  } else {
    return null;
  }
  if (!luhnValid(full.slice(2))) return null;
  const year = Number(full.slice(0, 4));
  const month = Number(full.slice(4, 6));
  let day = Number(full.slice(6, 8));
  if (day > 60) day -= 60; // samordningsnummer
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${full.slice(0, 8)}-${full.slice(8)}`;
}

/** Birth date (UTC) from a normalised personnummer. */
export function birthDateFromPersonalNumber(pnr: string): Date {
  const year = Number(pnr.slice(0, 4));
  const month = Number(pnr.slice(4, 6));
  let day = Number(pnr.slice(6, 8));
  if (day > 60) day -= 60;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * OCR payment reference (Bankgirot "OCR-nummer") with length and Luhn check
 * digits: base + length digit + check digit.
 */
export function ocrReference(base: string | number): string {
  const payload = String(base).replace(/\D/g, '');
  const lengthDigit = String((payload.length + 2) % 10);
  const withLength = payload + lengthDigit;
  return withLength + String(luhnChecksumDigit(withLength));
}

export function isValidOcr(ocr: string): boolean {
  if (!/^\d{2,25}$/.test(ocr)) return false;
  const lengthDigit = Number(ocr[ocr.length - 2]);
  return lengthDigit === ocr.length % 10 && luhnValid(ocr);
}

/** Swedish VAT number from an organisationsnummer: SE + 10 digits + 01. */
export function vatNumberFromOrg(orgNumber: string): string {
  return `SE${orgNumber.replace('-', '')}01`;
}
