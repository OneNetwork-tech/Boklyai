/**
 * Parse bank statement CSV exports. Handles the common Swedish formats
 * (Swedbank, SEB, Handelsbanken, Nordea, Danske, Lunar…): ';' ',' or tab
 * separators, quoted fields, Swedish number format ("1 234,56", "-1.234,56",
 * "−123,00"), and dates as YYYY-MM-DD / YYYYMMDD / YYYY/MM/DD / DD.MM.YYYY.
 */
import crypto from 'crypto';
import { isIsoDate } from '../utils/dates';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number; // öre, signed: + incoming, − outgoing
  balance: number | null;
  hash: string;
}

const HEADERS = {
  date: ['bokföringsdag', 'bokföringsdatum', 'bokförd', 'transaktionsdag', 'transaktionsdatum', 'datum', 'date', 'booking date', 'valutadag', 'reskontradatum'],
  description: ['text', 'beskrivning', 'transaktion', 'specifikation', 'meddelande', 'rubrik', 'mottagare', 'referens', 'description', 'namn', 'transaktionstext'],
  amount: ['belopp', 'amount', 'summa', 'insättning/uttag', 'belopp sek'],
  balance: ['saldo', 'balance', 'bokfört saldo', 'tillgängligt belopp'],
};

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; } else if (ch === '"') quoted = false; else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parse "1 234,56" / "-1.234,56" / "1,234.56" / "−12" into öre. */
export function parseSwedishAmount(raw: string): number | null {
  let s = raw.replace(/[\s ]/g, '').replace(/[−–]/g, '-').replace(/(SEK|kr)$/i, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, ''); // 1,234.56
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const negative = s.startsWith('-');
  const [whole, frac = ''] = s.replace('-', '').split('.');
  const ore = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return negative ? -ore : ore;
}

export function parseBankDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  let iso: string | null = m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  if (!iso) {
    const d = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (d) iso = `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
  }
  return iso && isIsoDate(iso) ? iso : null;
}

function findColumn(header: string[], names: string[]): number {
  const norm = header.map((h) => h.toLowerCase().replace(/^﻿/, '').trim());
  for (const n of names) {
    const i = norm.indexOf(n);
    if (i !== -1) return i;
  }
  for (const n of names) {
    const i = norm.findIndex((h) => h.startsWith(n));
    if (i !== -1) return i;
  }
  return -1;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: { line: number; message: string }[];
}

export function parseBankCsv(content: string): ParseResult {
  const text = content.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return { transactions: [], errors: [{ line: 0, message: 'The file is empty' }] };

  // Some banks prepend account info rows; find the header row within the first 10 lines.
  let headerIdx = -1;
  let sep = ';';
  let cols = { date: -1, description: -1, amount: -1, balance: -1 };
  for (let i = 0; i < Math.min(lines.length, 10) && headerIdx === -1; i += 1) {
    for (const candidate of [';', '\t', ',']) {
      const header = splitCsvLine(lines[i], candidate);
      if (header.length < 3) continue;
      const found = {
        date: findColumn(header, HEADERS.date),
        description: findColumn(header, HEADERS.description),
        amount: findColumn(header, HEADERS.amount),
        balance: findColumn(header, HEADERS.balance),
      };
      if (found.date !== -1 && found.amount !== -1 && found.description !== -1) {
        headerIdx = i;
        sep = candidate;
        cols = found;
        break;
      }
    }
  }
  if (headerIdx === -1) {
    return { transactions: [], errors: [{ line: 1, message: 'Could not find a header row with date, text and amount columns (e.g. "Datum;Text;Belopp")' }] };
  }

  const transactions: ParsedTransaction[] = [];
  const errors: ParseResult['errors'] = [];
  const seen = new Map<string, number>();
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const f = splitCsvLine(lines[i], sep);
    const date = parseBankDate(f[cols.date] || '');
    const amount = parseSwedishAmount(f[cols.amount] || '');
    const description = (f[cols.description] || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!date || amount === null) {
      errors.push({ line: i + 1, message: `Could not read date/amount ("${f[cols.date] ?? ''}", "${f[cols.amount] ?? ''}")` });
      continue;
    }
    if (amount === 0) continue;
    const balance = cols.balance !== -1 ? parseSwedishAmount(f[cols.balance] || '') : null;
    // Identical rows on the same day are legitimate (two coffees); number them
    // so that re-importing the same file is idempotent.
    const key = `${date}|${amount}|${description}`;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    const hash = crypto.createHash('sha256').update(`${key}|${n}`).digest('hex').slice(0, 40);
    transactions.push({ date, description: description || '(ingen text)', amount, balance, hash });
  }
  return { transactions, errors };
}
