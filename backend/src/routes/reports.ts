import { Router } from 'express';
import { z } from 'zod';
import { one, pool, query, transaction } from '../db';
import { requireRole } from '../middleware/auth';
import { idParam, isoDate, validate, valid } from '../middleware/validate';
import { audit } from '../services/audit';
import { postVoucher, SERIES } from '../services/ledger';
import {
  balanceSheet, generalLedger, incomeStatement, trialBalance, vatReport, vatSettlementLines,
} from '../services/reports';
import { exportSie4 } from '../services/sie';
import { addMonths, endOfMonth, today } from '../utils/dates';
import { ah, conflict, unprocessable } from '../utils/errors';

const router = Router({ mergeParams: true });

const range = z.object({ from: isoDate, to: isoDate }).refine((r) => r.from <= r.to, 'from must be before to');

router.get('/reports/trial-balance', requireRole('viewer'), validate(range, 'query'), ah(async (req, res) => {
  const { from, to } = valid<{ from: string; to: string }>(req, 'query');
  const rows = await trialBalance(pool, req.company!.id, from, to);
  res.json({
    data: {
      from,
      to,
      accounts: rows,
      totals: {
        debit: rows.reduce((s, r) => s + r.debit, 0),
        credit: rows.reduce((s, r) => s + r.credit, 0),
        closing: rows.reduce((s, r) => s + r.closing, 0),
      },
    },
  });
}));

router.get('/reports/income-statement', requireRole('viewer'), validate(range, 'query'), ah(async (req, res) => {
  const { from, to } = valid<{ from: string; to: string }>(req, 'query');
  res.json({ data: await incomeStatement(pool, req.company!.id, from, to) });
}));

router.get('/reports/balance-sheet', requireRole('viewer'), validate(z.object({ date: isoDate }), 'query'), ah(async (req, res) => {
  const { date } = valid<{ date: string }>(req, 'query');
  res.json({ data: await balanceSheet(pool, req.company!.id, date) });
}));

router.get('/reports/general-ledger', requireRole('viewer'),
  validate(z.object({ account: z.coerce.number().int().min(1000).max(9999), from: isoDate, to: isoDate }), 'query'),
  ah(async (req, res) => {
    const q = valid<{ account: number; from: string; to: string }>(req, 'query');
    res.json({ data: await generalLedger(pool, req.company!.id, q.account, q.from, q.to) });
  }));

// --- VAT -------------------------------------------------------------------------

router.get('/vat/report', requireRole('viewer'), validate(range, 'query'), ah(async (req, res) => {
  const { from, to } = valid<{ from: string; to: string }>(req, 'query');
  const settled = await one(pool, `SELECT r.id, r.created_at, v.series || v.number AS voucher_ref FROM vat_reports r
                                   JOIN vouchers v ON v.id = r.voucher_id WHERE r.company_id = $1 AND r.period_start = $2 AND r.period_end = $3`,
  [req.company!.id, from, to]);
  res.json({ data: { ...(await vatReport(pool, req.company!.id, from, to)), settled: settled ? { voucherRef: settled.voucher_ref, at: settled.created_at } : null } });
}));

router.get('/vat/periods', requireRole('viewer'), ah(async (req, res) => {
  const company = await one(pool, 'SELECT vat_period FROM companies WHERE id = $1', [req.company!.id]);
  const months = company!.vat_period === 'monthly' ? 1 : company!.vat_period === 'quarterly' ? 3 : 12;
  const fys = await query(pool, 'SELECT start_date, end_date FROM fiscal_years WHERE company_id = $1 ORDER BY start_date', [req.company!.id]);
  const settled = await query(pool, 'SELECT period_start, period_end FROM vat_reports WHERE company_id = $1', [req.company!.id]);
  const periods: { from: string; to: string; settled: boolean }[] = [];
  for (const fy of fys) {
    if (months === 12) {
      // Yearly VAT follows the fiscal year.
      periods.push({ from: fy.start_date, to: fy.end_date, settled: false });
      continue;
    }
    // Monthly/quarterly VAT follows calendar months/quarters.
    const month = Number(fy.start_date.slice(5, 7));
    let from = `${fy.start_date.slice(0, 5)}${String(months === 3 ? Math.floor((month - 1) / 3) * 3 + 1 : month).padStart(2, '0')}-01`;
    while (from <= fy.end_date) {
      const to = endOfMonth(addMonths(from, months - 1));
      if (!periods.some((p) => p.from === from)) periods.push({ from, to, settled: false });
      from = addMonths(from, months);
    }
  }
  for (const p of periods) p.settled = settled.some((s) => s.period_start === p.from && s.period_end === p.to);
  res.json({ data: periods.reverse() });
}));

router.post('/vat/settle', requireRole('accountant'), validate(range), ah(async (req, res) => {
  const { from, to } = valid<{ from: string; to: string }>(req);
  if (to >= today()) throw unprocessable('A VAT period can only be settled after it has ended');
  const result = await transaction(async (c) => {
    const overlap = await one(c, `SELECT 1 FROM vat_reports WHERE company_id = $1 AND period_start <= $3 AND period_end >= $2`, [req.company!.id, from, to]);
    if (overlap) throw conflict('VAT for this period (or part of it) has already been settled');
    const report = await vatReport(c, req.company!.id, from, to);
    const { lines, toPay } = await vatSettlementLines(c, req.company!.id, from, to);
    if (lines.length < 2) throw unprocessable('There is no VAT to settle in this period');
    const v = await postVoucher(c, {
      companyId: req.company!.id,
      date: to,
      series: SERIES.vat,
      description: `Momsredovisning ${from} – ${to}`,
      lines,
      sourceType: 'vat',
      userId: req.session!.user.id,
    });
    await c.query(`INSERT INTO vat_reports (company_id, period_start, period_end, boxes, voucher_id, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.company!.id, from, to, JSON.stringify(report.kronor), v.id, req.session!.user.id]);
    await audit(req, 'vat.settle', 'vat_report', null, { from, to, toPay }, c);
    return { voucherRef: `${v.series}${v.number}`, toPay };
  });
  res.status(201).json({ data: result });
}));

// --- Dashboard ---------------------------------------------------------------------

router.get('/dashboard', requireRole('viewer'), ah(async (req, res) => {
  const cid = req.company!.id;
  const t = today();
  const fy = await one(pool, `SELECT * FROM fiscal_years WHERE company_id = $1 AND $2::date BETWEEN start_date AND end_date`, [cid, t])
    || await one(pool, 'SELECT * FROM fiscal_years WHERE company_id = $1 ORDER BY start_date DESC LIMIT 1', [cid]);
  const to = t < fy!.end_date ? t : fy!.end_date;
  const pl = await one(pool, `
    SELECT COALESCE(SUM(CASE WHEN a.number BETWEEN 3000 AND 3999 THEN l.credit - l.debit END), 0) AS revenue,
           COALESCE(SUM(CASE WHEN a.number BETWEEN 4000 AND 8998 THEN l.debit - l.credit END), 0) AS costs
      FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
     WHERE v.company_id = $1 AND v.date BETWEEN $2 AND $3`, [cid, fy!.start_date, to]);
  const cash = await one(pool, `
    SELECT COALESCE(SUM(l.debit - l.credit), 0) AS balance FROM voucher_lines l JOIN accounts a ON a.id = l.account_id
     WHERE a.company_id = $1 AND a.number BETWEEN 1900 AND 1999`, [cid]);
  const ar = await one(pool, `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding, count(*) AS n,
                                COALESCE(SUM(CASE WHEN due_date < $2 THEN total_amount - paid_amount END), 0) AS overdue,
                                count(*) FILTER (WHERE due_date < $2) AS overdue_n
                              FROM invoices WHERE company_id = $1 AND status = 'issued'`, [cid, t]);
  const ap = await one(pool, `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding, count(*) AS n,
                                COALESCE(SUM(CASE WHEN due_date <= $2::date + 7 THEN total_amount - paid_amount END), 0) AS due_soon
                              FROM bills WHERE company_id = $1 AND status = 'booked'`, [cid, t]);
  const monthly = await query(pool, `
    SELECT to_char(date_trunc('month', v.date), 'YYYY-MM') AS month,
           COALESCE(SUM(CASE WHEN a.number BETWEEN 3000 AND 3999 THEN l.credit - l.debit END), 0) AS revenue,
           COALESCE(SUM(CASE WHEN a.number BETWEEN 4000 AND 8998 THEN l.debit - l.credit END), 0) AS costs
      FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
     WHERE v.company_id = $1 AND v.date > ($2::date - interval '12 months') AND v.date <= $2 AND v.source_type <> 'year_end'
     GROUP BY 1 ORDER BY 1`, [cid, t]);
  const unmatched = await one(pool, `SELECT count(*) AS n FROM bank_transactions WHERE company_id = $1 AND status = 'unmatched'`, [cid]);
  const vatOpen = await one(pool, `
    SELECT COALESCE(SUM(l.credit - l.debit), 0) AS balance FROM voucher_lines l JOIN accounts a ON a.id = l.account_id
     WHERE a.company_id = $1 AND a.vat_code IN ('U25', 'U12', 'U6', 'IN')`, [cid]);
  const recent = await query(pool, `SELECT id, series || number AS ref, date, description FROM vouchers WHERE company_id = $1 ORDER BY id DESC LIMIT 8`, [cid]);

  // Fill missing months so charts have a continuous axis.
  const months: { month: string; revenue: number; costs: number }[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const m = addMonths(`${t.slice(0, 7)}-01`, -i).slice(0, 7);
    const row = monthly.find((r) => r.month === m);
    months.push({ month: m, revenue: row?.revenue ?? 0, costs: row?.costs ?? 0 });
  }
  res.json({
    data: {
      fiscalYear: { start: fy!.start_date, end: fy!.end_date },
      revenue: pl!.revenue,
      costs: pl!.costs,
      result: pl!.revenue - pl!.costs,
      cash: cash!.balance,
      receivables: { outstanding: ar!.outstanding, count: ar!.n, overdue: ar!.overdue, overdueCount: ar!.overdue_n },
      payables: { outstanding: ap!.outstanding, count: ap!.n, dueSoon: ap!.due_soon },
      unmatchedBankTransactions: unmatched!.n,
      vatBalance: vatOpen!.balance,
      monthly: months,
      recentVouchers: recent,
    },
  });
}));

// --- SIE --------------------------------------------------------------------------

router.get('/sie/:fiscalYearId', requireRole('accountant'), ah(async (req, res) => {
  const { filename, content } = await exportSie4(pool, req.company!.id, idParam(req.params.fiscalYearId));
  await audit(req, 'sie.export', 'fiscal_year', idParam(req.params.fiscalYearId));
  res.set({
    'Content-Type': 'text/plain; charset=IBM437',
    'Content-Disposition': `attachment; filename="${filename}"`,
  }).send(content);
}));

export default router;
