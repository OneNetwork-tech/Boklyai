import { Router } from 'express';
import { z } from 'zod';
import { one, pool, query, transaction } from '../db';
import { accountClass } from '../data/bas';
import { requireRole } from '../middleware/auth';
import {
  accountNumber, idParam, isoDate, text, validate, valid,
} from '../middleware/validate';
import { audit } from '../services/audit';
import {
  closeFiscalYear, loadVoucher, postVoucher, reverseVoucher, SERIES,
} from '../services/ledger';
import { addDays, addMonths, today } from '../utils/dates';
import { ah, badRequest, conflict, notFound, unprocessable } from '../utils/errors';

const router = Router({ mergeParams: true });

// --- Chart of accounts ----------------------------------------------------------

router.get('/accounts', requireRole('viewer'), ah(async (req, res) => {
  const rows = await query(pool, `
    SELECT a.id, a.number, a.name, a.vat_code, a.active,
           EXISTS (SELECT 1 FROM voucher_lines l WHERE l.account_id = a.id) AS used
      FROM accounts a WHERE a.company_id = $1 ORDER BY a.number`, [req.company!.id]);
  res.json({
    data: rows.map((a) => ({
      id: a.id, number: a.number, name: a.name, vatCode: a.vat_code, active: a.active, used: a.used, class: accountClass(a.number),
    })),
  });
}));

const accountSchema = z.object({
  number: accountNumber,
  name: z.string().trim().min(1).max(200),
  vatCode: z.string().trim().max(10).nullable().optional(),
});

router.post('/accounts', requireRole('accountant'), validate(accountSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof accountSchema>>(req);
  try {
    const a = await one(pool, 'INSERT INTO accounts (company_id, number, name, vat_code) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.company!.id, b.number, b.name, b.vatCode ?? null]);
    await audit(req, 'account.create', 'account', a!.id, { number: b.number, name: b.name });
    res.status(201).json({ data: { id: a!.id, number: a!.number, name: a!.name, vatCode: a!.vat_code, active: a!.active } });
  } catch (err: any) {
    if (err.code === '23505') throw conflict(`Account ${b.number} already exists`);
    throw err;
  }
}));

const accountUpdate = z.object({ name: z.string().trim().min(1).max(200).optional(), active: z.boolean().optional() });

router.patch('/accounts/:number', requireRole('accountant'), validate(accountUpdate), ah(async (req, res) => {
  const number = idParam(req.params.number);
  const b = valid<z.infer<typeof accountUpdate>>(req);
  const a = await one(pool, `UPDATE accounts SET name = COALESCE($1, name), active = COALESCE($2, active)
                             WHERE company_id = $3 AND number = $4 RETURNING *`, [b.name ?? null, b.active ?? null, req.company!.id, number]);
  if (!a) throw notFound('Account not found');
  await audit(req, 'account.update', 'account', a.id, b);
  res.json({ data: { id: a.id, number: a.number, name: a.name, vatCode: a.vat_code, active: a.active } });
}));

// --- Fiscal years ---------------------------------------------------------------

router.get('/fiscal-years', requireRole('viewer'), ah(async (req, res) => {
  const rows = await query(pool, `SELECT f.*, (SELECT count(*) FROM vouchers v WHERE v.fiscal_year_id = f.id) AS voucher_count
                                  FROM fiscal_years f WHERE company_id = $1 ORDER BY start_date DESC`, [req.company!.id]);
  res.json({
    data: rows.map((f) => ({
      id: f.id, startDate: f.start_date, endDate: f.end_date, closed: f.closed, closedAt: f.closed_at, voucherCount: f.voucher_count,
    })),
  });
}));

/** Create the next fiscal year after the latest one (12 months). */
router.post('/fiscal-years', requireRole('accountant'), ah(async (req, res) => {
  const fy = await transaction(async (c) => {
    const last = await one(c, 'SELECT end_date FROM fiscal_years WHERE company_id = $1 ORDER BY end_date DESC LIMIT 1 FOR UPDATE', [req.company!.id]);
    const start = addDays(last!.end_date, 1);
    if (start > addMonths(today(), 12)) throw unprocessable('The next fiscal year can only be created within 12 months of its start');
    return one(c, 'INSERT INTO fiscal_years (company_id, start_date, end_date) VALUES ($1, $2, $3) RETURNING *',
      [req.company!.id, start, addDays(addMonths(start, 12), -1)]);
  });
  await audit(req, 'fiscal_year.create', 'fiscal_year', fy!.id);
  res.status(201).json({ data: { id: fy!.id, startDate: fy!.start_date, endDate: fy!.end_date, closed: false } });
}));

router.post('/fiscal-years/:id/close', requireRole('owner'), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const r = await transaction((c) => closeFiscalYear(c, req.company!.id, id, req.session!.user.id));
  await audit(req, 'fiscal_year.close', 'fiscal_year', id, { result: r.result });
  res.json({ data: { result: r.result, voucher: r.voucher } });
}));

// --- Vouchers -------------------------------------------------------------------

const listQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  series: z.string().regex(/^[A-Z]$/).optional(),
  account: z.coerce.number().int().optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get('/vouchers', requireRole('viewer'), validate(listQuery, 'query'), ah(async (req, res) => {
  const q = valid<z.infer<typeof listQuery>>(req, 'query');
  const where = ['v.company_id = $1'];
  const params: unknown[] = [req.company!.id];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (q.from) add('v.date >= ?', q.from);
  if (q.to) add('v.date <= ?', q.to);
  if (q.series) add('v.series = ?', q.series);
  if (q.q) add("v.description ILIKE '%' || ? || '%'", q.q.replace(/[\\%_]/g, '\\$&'));
  if (q.account) add('EXISTS (SELECT 1 FROM voucher_lines l JOIN accounts a ON a.id = l.account_id WHERE l.voucher_id = v.id AND a.number = ?)', q.account);
  const rows = await query(pool, `
    SELECT v.id, v.series, v.number, v.date, v.description, v.source_type, v.reversed_by_id, v.reverses_id,
           (SELECT SUM(debit) FROM voucher_lines WHERE voucher_id = v.id) AS total, count(*) OVER() AS total_count
      FROM vouchers v WHERE ${where.join(' AND ')}
     ORDER BY v.date DESC, v.id DESC LIMIT ${q.limit} OFFSET ${q.offset}`, params);
  res.json({
    data: rows.map((v) => ({
      id: v.id, ref: `${v.series}${v.number}`, series: v.series, number: v.number, date: v.date, description: v.description,
      sourceType: v.source_type, total: v.total, reversed: Boolean(v.reversed_by_id), isReversal: Boolean(v.reverses_id),
    })),
    total: rows[0]?.total_count ?? 0,
  });
}));

router.get('/vouchers/:id', requireRole('viewer'), ah(async (req, res) => {
  const v = await loadVoucher(pool, req.company!.id, idParam(req.params.id));
  if (!v) throw notFound('Voucher not found');
  res.json({ data: v });
}));

const lineSchema = z.object({
  account: accountNumber,
  debit: z.number().int().min(0).optional(),
  credit: z.number().int().min(0).optional(),
  description: text(300).optional(),
});

const voucherSchema = z.object({
  date: isoDate,
  description: z.string().trim().min(1).max(500),
  lines: z.array(lineSchema).min(2).max(200),
  documentIds: z.array(z.number().int().positive()).max(20).optional(),
});

router.post('/vouchers', requireRole('accountant'), validate(voucherSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof voucherSchema>>(req);
  if (b.date > addDays(today(), 31)) throw badRequest('Vouchers cannot be dated more than a month ahead');
  const posted = await transaction(async (c) => {
    const v = await postVoucher(c, {
      companyId: req.company!.id,
      date: b.date,
      series: SERIES.manual,
      description: b.description,
      lines: b.lines,
      sourceType: 'manual',
      userId: req.session!.user.id,
    });
    if (b.documentIds?.length) {
      const r = await c.query('UPDATE documents SET voucher_id = $1 WHERE company_id = $2 AND id = ANY($3::bigint[]) AND voucher_id IS NULL',
        [v.id, req.company!.id, b.documentIds]);
      if (r.rowCount !== b.documentIds.length) throw badRequest('One or more documents do not exist or are already attached');
    }
    await audit(req, 'voucher.create', 'voucher', v.id, { ref: `${v.series}${v.number}` }, c);
    return v;
  });
  res.status(201).json({ data: await loadVoucher(pool, req.company!.id, posted.id) });
}));

const reverseSchema = z.object({ date: isoDate.optional(), reason: text(200).optional() });

/**
 * Reverse a voucher. Vouchers created by invoices, bills, payments, payroll or
 * VAT settlements must be corrected from their source document instead.
 */
router.post('/vouchers/:id/reverse', requireRole('accountant'), validate(reverseSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof reverseSchema>>(req);
  const posted = await transaction(async (c) => {
    const v = await one(c, 'SELECT source_type, reverses_id FROM vouchers WHERE id = $1 AND company_id = $2', [id, req.company!.id]);
    if (!v) throw notFound('Voucher not found');
    if (v.reverses_id) throw conflict('A reversing voucher cannot itself be reversed');
    if (!['manual', 'bank'].includes(v.source_type)) {
      throw unprocessable(`This voucher was created from a ${v.source_type.replace('_', ' ')}; correct it there instead (e.g. with a credit note)`);
    }
    const r = await reverseVoucher(c, req.company!.id, id, b.date || today(), req.session!.user.id, b.reason);
    if (v.source_type === 'bank') {
      // The bank transaction becomes unbooked again so it can be categorised anew.
      await c.query(`UPDATE bank_transactions SET status = 'unmatched', voucher_id = NULL, matched_type = NULL, matched_id = NULL
                     WHERE company_id = $1 AND voucher_id = $2`, [req.company!.id, id]);
    }
    await audit(req, 'voucher.reverse', 'voucher', id, { reversal: `${r.series}${r.number}` }, c);
    return r;
  });
  res.status(201).json({ data: await loadVoucher(pool, req.company!.id, posted.id) });
}));

export default router;
