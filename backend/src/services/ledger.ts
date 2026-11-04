/**
 * General ledger: posting vouchers (verifikationer).
 *
 * Invariants (also enforced by DB constraints/triggers):
 *  - debit == credit, ≥ 2 lines, each line one-sided and positive
 *  - voucher numbers are gapless per company / fiscal year / series
 *  - the date lies in an open fiscal year and after the company's lock date
 *  - vouchers are immutable; corrections are reversing vouchers
 */
import type { PoolClient } from 'pg';
import { one, query } from '../db';
import { YEAR_RESULT_BS_ACCOUNT, YEAR_RESULT_PL_ACCOUNT } from '../data/bas';
import { addDays, addMonths } from '../utils/dates';
import { badRequest, conflict, notFound, unprocessable } from '../utils/errors';

export const SERIES = {
  manual: 'A',
  bank: 'B',
  invoice: 'F',
  invoicePayment: 'I',
  bill: 'L',
  billPayment: 'U',
  payroll: 'P',
  vat: 'M',
  yearEnd: 'Y',
} as const;

export interface PostingLine {
  account: number;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface PostVoucherInput {
  companyId: number;
  date: string;
  series: string;
  description: string;
  lines: PostingLine[];
  sourceType: string;
  sourceId?: number | null;
  userId: number | null;
  reversesId?: number | null;
}

export interface PostedVoucher {
  id: number;
  series: string;
  number: number;
  fiscalYearId: number;
  date: string;
}

/** Atomically take the next value of a per-company sequence (row-locked until commit). */
export async function nextNumber(c: PoolClient, companyId: number, key: string, start = 1): Promise<number> {
  const row = await one(c, `
    INSERT INTO number_sequences (company_id, key, next_value) VALUES ($1, $2, $3 + 1)
    ON CONFLICT (company_id, key) DO UPDATE SET next_value = number_sequences.next_value + 1
    RETURNING next_value - 1 AS value`, [companyId, key, start]);
  return row!.value;
}

/** The open fiscal year containing `date`, honouring the company lock date. */
export async function openFiscalYearFor(c: PoolClient, companyId: number, date: string) {
  const company = await one(c, 'SELECT locked_until FROM companies WHERE id = $1 FOR SHARE', [companyId]);
  if (!company) throw notFound('Company not found');
  if (company.locked_until && date <= company.locked_until) {
    throw unprocessable(`The period up to ${company.locked_until} is locked; choose a later date`);
  }
  const fy = await one(c, `SELECT id, closed, start_date, end_date FROM fiscal_years
                           WHERE company_id = $1 AND $2::date BETWEEN start_date AND end_date`, [companyId, date]);
  if (!fy) throw unprocessable(`No fiscal year covers ${date}. Create the fiscal year first.`);
  if (fy.closed) throw unprocessable(`The fiscal year ${fy.start_date} – ${fy.end_date} is closed`);
  return fy as { id: number; start_date: string; end_date: string };
}

export async function postVoucher(c: PoolClient, input: PostVoucherInput): Promise<PostedVoucher> {
  const lines = input.lines
    .map((l) => ({ ...l, debit: l.debit ?? 0, credit: l.credit ?? 0 }))
    .filter((l) => l.debit !== 0 || l.credit !== 0);

  for (const l of lines) {
    if (!Number.isInteger(l.debit) || !Number.isInteger(l.credit)) throw badRequest('Amounts must be whole öre');
    if (l.debit < 0 || l.credit < 0) throw badRequest('Debit and credit must be positive');
    if (l.debit > 0 && l.credit > 0) throw badRequest('A line cannot have both debit and credit');
  }
  if (lines.length < 2) throw badRequest('A voucher needs at least two lines with amounts');
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  if (debit !== credit) throw badRequest(`The voucher does not balance (debit ${debit} öre, credit ${credit} öre)`);
  if (!input.description.trim()) throw badRequest('A voucher needs a description');

  const fy = await openFiscalYearFor(c, input.companyId, input.date);

  const numbers = [...new Set(lines.map((l) => l.account))];
  const accounts = await query(c, 'SELECT id, number, active FROM accounts WHERE company_id = $1 AND number = ANY($2::int[])', [input.companyId, numbers]);
  const byNumber = new Map(accounts.map((a) => [a.number, a]));
  const missing = numbers.filter((n) => !byNumber.has(n));
  if (missing.length) throw badRequest(`Unknown account(s): ${missing.join(', ')}. Add them to the chart of accounts first.`);
  const inactive = numbers.filter((n) => !byNumber.get(n).active);
  if (inactive.length) throw badRequest(`Inactive account(s): ${inactive.join(', ')}`);

  const number = await nextNumber(c, input.companyId, `voucher:${fy.id}:${input.series}`);
  const v = await one(c, `
    INSERT INTO vouchers (company_id, fiscal_year_id, series, number, date, description, source_type, source_id, created_by, reverses_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
  [input.companyId, fy.id, input.series, number, input.date, input.description.trim().slice(0, 500),
    input.sourceType, input.sourceId ?? null, input.userId, input.reversesId ?? null]);

  const values: unknown[] = [];
  const rows = lines.map((l, i) => {
    const base = i * 7;
    values.push(v!.id, input.companyId, i + 1, byNumber.get(l.account).id, l.debit, l.credit, (l.description || '').slice(0, 300));
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });
  await c.query(`INSERT INTO voucher_lines (voucher_id, company_id, line_no, account_id, debit, credit, description)
                 VALUES ${rows.join(', ')}`, values);

  return { id: v!.id, series: input.series, number, fiscalYearId: fy.id, date: input.date };
}

/** Create a reversing voucher (same series) and link both directions. */
export async function reverseVoucher(c: PoolClient, companyId: number, voucherId: number, date: string, userId: number | null, reason = '') {
  const v = await one(c, 'SELECT * FROM vouchers WHERE id = $1 AND company_id = $2 FOR UPDATE', [voucherId, companyId]);
  if (!v) throw notFound('Voucher not found');
  if (v.reversed_by_id) throw conflict('The voucher has already been reversed');
  if (v.reverses_id) throw conflict('A reversing voucher cannot itself be reversed');
  const lines = await query(c, `SELECT a.number, l.debit, l.credit, l.description FROM voucher_lines l
                                JOIN accounts a ON a.id = l.account_id WHERE l.voucher_id = $1 ORDER BY l.line_no`, [voucherId]);
  const posted = await postVoucher(c, {
    companyId,
    date,
    series: v.series,
    description: `Rättelse av ${v.series}${v.number}: ${v.description}${reason ? ` (${reason})` : ''}`,
    lines: lines.map((l) => ({ account: l.number, debit: l.credit, credit: l.debit, description: l.description })),
    sourceType: 'reversal',
    sourceId: voucherId,
    userId,
    reversesId: voucherId,
  });
  await c.query('UPDATE vouchers SET reversed_by_id = $1 WHERE id = $2', [posted.id, voucherId]);
  return posted;
}

export async function loadVoucher(db: PoolClient | import('pg').Pool, companyId: number, id: number) {
  const v = await one(db, `
    SELECT v.*, u.email AS created_by_email,
           r.series || r.number AS reversed_by_ref, o.series || o.number AS reverses_ref
      FROM vouchers v
      LEFT JOIN users u ON u.id = v.created_by
      LEFT JOIN vouchers r ON r.id = v.reversed_by_id
      LEFT JOIN vouchers o ON o.id = v.reverses_id
     WHERE v.id = $1 AND v.company_id = $2`, [id, companyId]);
  if (!v) return null;
  const lines = await query(db, `SELECT l.line_no, a.number AS account, a.name AS account_name, l.debit, l.credit, l.description
                                 FROM voucher_lines l JOIN accounts a ON a.id = l.account_id
                                 WHERE l.voucher_id = $1 ORDER BY l.line_no`, [id]);
  const documents = await query(db, 'SELECT id, original_name, mime_type FROM documents WHERE voucher_id = $1 AND company_id = $2', [id, companyId]);
  return {
    id: v.id,
    series: v.series,
    number: v.number,
    ref: `${v.series}${v.number}`,
    date: v.date,
    description: v.description,
    sourceType: v.source_type,
    sourceId: v.source_id,
    reversesId: v.reverses_id,
    reversesRef: v.reverses_ref,
    reversedById: v.reversed_by_id,
    reversedByRef: v.reversed_by_ref,
    createdBy: v.created_by_email,
    createdAt: v.created_at,
    lines: lines.map((l) => ({
      lineNo: l.line_no, account: l.account, accountName: l.account_name, debit: l.debit, credit: l.credit, description: l.description,
    })),
    total: lines.reduce((s, l) => s + l.debit, 0),
    documents: documents.map((d) => ({ id: d.id, name: d.original_name, mimeType: d.mime_type })),
  };
}

/**
 * Close a fiscal year: book the result (8999 ↔ 2099), lock the year and make
 * sure the next year exists. Earlier years must already be closed.
 */
export async function closeFiscalYear(c: PoolClient, companyId: number, fiscalYearId: number, userId: number) {
  const fy = await one(c, 'SELECT * FROM fiscal_years WHERE id = $1 AND company_id = $2 FOR UPDATE', [fiscalYearId, companyId]);
  if (!fy) throw notFound('Fiscal year not found');
  if (fy.closed) throw conflict('The fiscal year is already closed');
  const earlierOpen = await one(c, 'SELECT 1 FROM fiscal_years WHERE company_id = $1 AND start_date < $2 AND NOT closed', [companyId, fy.start_date]);
  if (earlierOpen) throw unprocessable('Close earlier fiscal years first');

  const res = await one(c, `
    SELECT COALESCE(SUM(l.credit - l.debit), 0) AS result
      FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
     WHERE v.company_id = $1 AND v.fiscal_year_id = $2 AND a.number >= 3000`, [companyId, fiscalYearId]);
  const result: number = res!.result; // positive = profit

  // Temporarily lift the lock so the closing voucher can be posted on the last
  // day, then restore it (never earlier than the year end).
  const prev = await one(c, 'SELECT locked_until FROM companies WHERE id = $1 FOR UPDATE', [companyId]);
  const prevLock: string | null = prev!.locked_until;
  await c.query('UPDATE companies SET locked_until = NULL WHERE id = $1', [companyId]);
  let voucher: PostedVoucher | null = null;
  if (result !== 0) {
    const amount = Math.abs(result);
    voucher = await postVoucher(c, {
      companyId,
      date: fy.end_date,
      series: SERIES.yearEnd,
      description: `Årets resultat ${fy.start_date} – ${fy.end_date}`,
      lines: result > 0
        ? [{ account: YEAR_RESULT_PL_ACCOUNT, debit: amount }, { account: YEAR_RESULT_BS_ACCOUNT, credit: amount }]
        : [{ account: YEAR_RESULT_BS_ACCOUNT, debit: amount }, { account: YEAR_RESULT_PL_ACCOUNT, credit: amount }],
      sourceType: 'year_end',
      sourceId: fiscalYearId,
      userId,
    });
  }
  await c.query('UPDATE fiscal_years SET closed = true, closed_at = now() WHERE id = $1', [fiscalYearId]);
  const newLock = prevLock && prevLock > fy.end_date ? prevLock : fy.end_date;
  await c.query('UPDATE companies SET locked_until = $2 WHERE id = $1', [companyId, newLock]);

  const nextStart = addDays(fy.end_date, 1);
  const next = await one(c, 'SELECT id FROM fiscal_years WHERE company_id = $1 AND start_date = $2', [companyId, nextStart]);
  if (!next) {
    // A following year is always 12 months, even if the first year was shortened/extended.
    await c.query('INSERT INTO fiscal_years (company_id, start_date, end_date) VALUES ($1, $2, $3)',
      [companyId, nextStart, addDays(addMonths(nextStart, 12), -1)]);
  }
  return { result, voucher };
}

