import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { config } from '../config';
import { pool } from '../db';
import { parseSwedishAmount, parseBankDate } from './bankImport';
import { normalizeOrgNumber, isValidOcr } from '../utils/swedish';

/** Detect the real file type from its first bytes; never trust the client's MIME type. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export function storagePath(storageKey: string): string {
  // storageKey is server-generated "<companyId>/<hex>"; validate anyway.
  if (!/^\d+\/[a-f0-9]{48}$/.test(storageKey)) throw new Error('Invalid storage key');
  return path.join(config.uploads.dir, storageKey);
}

export async function store(companyId: number, buf: Buffer): Promise<{ storageKey: string; sha256: string }> {
  const storageKey = `${companyId}/${crypto.randomBytes(24).toString('hex')}`;
  const file = storagePath(storageKey);
  await fs.promises.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.promises.writeFile(file, buf, { mode: 0o600, flag: 'wx' });
  return { storageKey, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}

function run(bin: string, args: string[], timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

async function extractText(file: string, mime: string): Promise<string | null> {
  if (mime === 'application/pdf') {
    try {
      const text = await run(config.ocr.pdftotextPath, ['-layout', '-l', '5', file, '-']);
      if (text.trim()) return text;
    } catch { /* fall through */ }
    return null;
  }
  try {
    return await run(config.ocr.tesseractPath, [file, 'stdout', '-l', 'swe+eng']);
  } catch {
    try {
      return await run(config.ocr.tesseractPath, [file, 'stdout']);
    } catch {
      return null;
    }
  }
}

export interface Extracted {
  total?: number;
  vat?: number;
  vatRate?: number;
  date?: string;
  dueDate?: string;
  orgNumber?: string;
  ocr?: string;
  bankgiro?: string;
  invoiceNumber?: string;
}

const AMOUNT = String.raw`(-?\d{1,3}(?:[  .]\d{3})*(?:[.,]\d{2})|-?\d+(?:[.,]\d{2}))`;

function findAmount(text: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const re = new RegExp(`${label}[^\\d\\n-]{0,40}${AMOUNT}`, 'i');
    const m = text.match(re);
    if (m) {
      const v = parseSwedishAmount(m[1]);
      if (v !== null) return v;
    }
  }
  return undefined;
}

/** Pull bookkeeping fields out of receipt / invoice text. Best effort; the user confirms. */
export function extractFields(text: string): Extracted {
  const out: Extracted = {};
  const total = findAmount(text, ['att betala', 'summa att betala', 'totalt att betala', 'totalbelopp', 'total(?:t)?', 'summa', 'belopp']);
  if (total !== undefined && total > 0) out.total = total;
  const vat = findAmount(text, ['varav moms', 'moms(?: 25 ?%| 12 ?%| 6 ?%)?', 'mervärdesskatt', 'vat']);
  if (vat !== undefined && vat >= 0) out.vat = vat;
  const rate = text.match(/moms\D{0,10}(25|12|6)\s?%/i) || text.match(/(25|12|6)\s?%\s?moms/i);
  if (rate) out.vatRate = Number(rate[1]);
  else if (out.total && out.vat) {
    for (const r of [25, 12, 6]) {
      if (Math.abs(out.vat - Math.round((out.total * r) / (100 + r))) <= 2) out.vatRate = r;
    }
  }
  const due = text.match(/(?:förfallodag|förfallodatum|förfaller|betalas senast)\D{0,20}(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4})/i);
  if (due) out.dueDate = parseBankDate(due[1]) || undefined;
  const dates = [...text.matchAll(/(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4})/g)].map((m) => parseBankDate(m[1])).filter(Boolean) as string[];
  const firstDate = dates.find((d) => d !== out.dueDate);
  if (firstDate) out.date = firstDate;
  for (const m of text.matchAll(/(\d{6}-\d{4})/g)) {
    const n = normalizeOrgNumber(m[1]);
    if (n) { out.orgNumber = n; break; }
  }
  const ocr = text.match(/ocr[^\d\n]{0,20}(\d[\d ]{1,30}\d)/i);
  if (ocr) {
    const digits = ocr[1].replace(/\s/g, '');
    if (isValidOcr(digits)) out.ocr = digits;
  }
  const bg = text.match(/(?:bankgiro|bg)[^\d\n]{0,10}(\d{3,4}-\d{4})/i);
  if (bg) out.bankgiro = bg[1];
  const inv = text.match(/(?:fakturanummer|fakturanr|faktura nr|invoice (?:no|number))[^\w\n]{0,5}([A-Z0-9-]{1,20})/i);
  if (inv) out.invoiceNumber = inv[1];
  return out;
}

/** Run OCR/extraction for a stored document and save the result. */
export async function processDocument(documentId: number): Promise<void> {
  const doc = (await pool.query('SELECT id, storage_key, mime_type FROM documents WHERE id = $1', [documentId])).rows[0];
  if (!doc) return;
  try {
    const text = await extractText(storagePath(doc.storage_key), doc.mime_type);
    if (text === null) {
      await pool.query(`UPDATE documents SET ocr_status = 'unavailable' WHERE id = $1`, [documentId]);
      return;
    }
    const extracted = extractFields(text);
    await pool.query(`UPDATE documents SET ocr_status = 'done', ocr_text = $1, extracted = $2 WHERE id = $3`,
      [text.slice(0, 50000), JSON.stringify(extracted), documentId]);
  } catch {
    await pool.query(`UPDATE documents SET ocr_status = 'failed' WHERE id = $1`, [documentId]);
  }
}
