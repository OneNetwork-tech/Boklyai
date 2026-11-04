import { Router } from 'express';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import { one, pool, query, transaction } from '../db';
import { DEFAULT_BANK_ACCOUNT } from '../data/bas';
import { requireRole } from '../middleware/auth';
import {
  accountNumber, idParam, isoDate, text, validate, valid,
} from '../middleware/validate';
import { audit } from '../services/audit';
import { postVoucher, SERIES } from '../services/ledger';
import { calculatePayslip, employerFeeRate } from '../services/payroll';
import { endOfMonth, startOfMonth } from '../utils/dates';
import { normalizePersonalNumber } from '../utils/swedish';
import { ah, badRequest, conflict, notFound, unprocessable } from '../utils/errors';

// Payroll contains personal data (personnummer, salaries): accountants and owners only.
const router = Router({ mergeParams: true });

const pnr = z.string().transform((v, ctx) => {
  const n = normalizePersonalNumber(v);
  if (!n) {
    ctx.addIssue({ code: 'custom', message: 'Invalid personnummer' });
    return z.NEVER;
  }
  return n;
});

const employeeSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  personalNumber: pnr,
  email: z.union([z.literal(''), z.email().max(254)]).optional(),
  employmentStart: isoDate,
  employmentEnd: isoDate.nullable().optional(),
  monthlySalary: z.number().int().min(0).max(1e9),
  taxRate: z.number().min(0).max(60),
  bankAccount: text(40).optional(),
  active: z.boolean().optional(),
});

function employeeJson(e: any) {
  return {
    id: e.id, firstName: e.first_name, lastName: e.last_name, personalNumber: e.personal_number, email: e.email,
    employmentStart: e.employment_start, employmentEnd: e.employment_end, monthlySalary: e.monthly_salary, taxRate: e.tax_rate,
    bankAccount: e.bank_account, active: e.active,
  };
}

router.get('/employees', requireRole('accountant'), ah(async (req, res) => {
  const rows = await query(pool, 'SELECT * FROM employees WHERE company_id = $1 ORDER BY last_name, first_name', [req.company!.id]);
  res.json({ data: rows.map(employeeJson) });
}));

router.post('/employees', requireRole('accountant'), validate(employeeSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof employeeSchema>>(req);
  if (b.employmentEnd && b.employmentEnd < b.employmentStart) throw badRequest('Employment cannot end before it starts');
  try {
    const row = await one(pool, `INSERT INTO employees (company_id, first_name, last_name, personal_number, email, employment_start, employment_end, monthly_salary, tax_rate, bank_account)
                                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [req.company!.id, b.firstName, b.lastName, b.personalNumber, b.email || '', b.employmentStart, b.employmentEnd ?? null, b.monthlySalary, b.taxRate, b.bankAccount || '']);
    await audit(req, 'employee.create', 'employee', row!.id);
    res.status(201).json({ data: employeeJson(row) });
  } catch (err: any) {
    if (err.code === '23505') throw conflict('An employee with this personnummer already exists');
    throw err;
  }
}));

router.put('/employees/:id', requireRole('accountant'), validate(employeeSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof employeeSchema>>(req);
  const row = await one(pool, `UPDATE employees SET first_name = $1, last_name = $2, personal_number = $3, email = $4, employment_start = $5,
                                 employment_end = $6, monthly_salary = $7, tax_rate = $8, bank_account = $9, active = COALESCE($10, active)
                               WHERE id = $11 AND company_id = $12 RETURNING *`,
  [b.firstName, b.lastName, b.personalNumber, b.email || '', b.employmentStart, b.employmentEnd ?? null, b.monthlySalary, b.taxRate,
    b.bankAccount || '', b.active ?? null, id, req.company!.id]);
  if (!row) throw notFound('Employee not found');
  await audit(req, 'employee.update', 'employee', id);
  res.json({ data: employeeJson(row) });
}));

// --- Payroll runs -------------------------------------------------------------------

async function loadRun(db: any, companyId: number, id: number) {
  const run = await one(db, `SELECT r.*, v.series || v.number AS voucher_ref FROM payroll_runs r LEFT JOIN vouchers v ON v.id = r.voucher_id
                             WHERE r.id = $1 AND r.company_id = $2`, [id, companyId]);
  if (!run) return null;
  const slips = await query(db, `SELECT p.*, e.first_name, e.last_name, e.personal_number, e.bank_account FROM payslips p
                                 JOIN employees e ON e.id = p.employee_id WHERE p.payroll_run_id = $1 ORDER BY e.last_name, e.first_name`, [id]);
  return {
    id: run.id, period: run.period, payDate: run.pay_date, status: run.status, voucherId: run.voucher_id, voucherRef: run.voucher_ref,
    totals: { gross: run.total_gross, tax: run.total_tax, employerFee: run.total_employer_fee, net: run.total_net },
    payslips: slips.map((p) => ({
      id: p.id,
      employeeId: p.employee_id,
      name: `${p.first_name} ${p.last_name}`,
      personalNumber: p.personal_number,
      bankAccount: p.bank_account,
      baseSalary: p.base_salary,
      additions: p.additions,
      deductions: p.deductions,
      gross: p.gross,
      taxRate: p.tax_rate,
      tax: p.tax,
      net: p.net,
      employerFeeRate: p.employer_fee_rate,
      employerFee: p.employer_fee,
    })),
  };
}

async function updateTotals(c: PoolClient, runId: number) {
  await c.query(`UPDATE payroll_runs r SET total_gross = s.gross, total_tax = s.tax, total_employer_fee = s.fee, total_net = s.net
                   FROM (SELECT COALESCE(SUM(gross), 0) gross, COALESCE(SUM(tax), 0) tax, COALESCE(SUM(employer_fee), 0) fee, COALESCE(SUM(net), 0) net
                           FROM payslips WHERE payroll_run_id = $1) s
                  WHERE r.id = $1`, [runId]);
}

router.get('/payroll-runs', requireRole('accountant'), ah(async (req, res) => {
  const rows = await query(pool, 'SELECT * FROM payroll_runs WHERE company_id = $1 ORDER BY period DESC', [req.company!.id]);
  res.json({
    data: rows.map((r) => ({
      id: r.id, period: r.period, payDate: r.pay_date, status: r.status,
      totals: { gross: r.total_gross, tax: r.total_tax, employerFee: r.total_employer_fee, net: r.total_net },
    })),
  });
}));

router.get('/payroll-runs/:id', requireRole('accountant'), ah(async (req, res) => {
  const run = await loadRun(pool, req.company!.id, idParam(req.params.id));
  if (!run) throw notFound('Payroll run not found');
  res.json({ data: run });
}));

const runSchema = z.object({ period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period is YYYY-MM'), payDate: isoDate });

/** Create a draft run with a payslip for every employee employed during the period. */
router.post('/payroll-runs', requireRole('accountant'), validate(runSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof runSchema>>(req);
  const periodStart = `${b.period}-01`;
  const periodEnd = endOfMonth(periodStart);
  const id = await transaction(async (c) => {
    if (await one(c, 'SELECT 1 FROM payroll_runs WHERE company_id = $1 AND period = $2', [req.company!.id, b.period])) {
      throw conflict(`A payroll run for ${b.period} already exists`);
    }
    const employees = await query(c, `SELECT * FROM employees WHERE company_id = $1 AND active AND employment_start <= $2
                                       AND (employment_end IS NULL OR employment_end >= $3) ORDER BY id`, [req.company!.id, periodEnd, startOfMonth(periodStart)]);
    if (!employees.length) throw unprocessable('No active employees in this period');
    const run = await one(c, 'INSERT INTO payroll_runs (company_id, period, pay_date, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.company!.id, b.period, b.payDate, req.session!.user.id]);
    const year = Number(b.payDate.slice(0, 4));
    for (const e of employees) {
      const calc = calculatePayslip({ baseSalary: e.monthly_salary, taxRate: e.tax_rate, employerFeeRate: employerFeeRate(e.personal_number, year) });
      await c.query(`INSERT INTO payslips (payroll_run_id, employee_id, base_salary, additions, deductions, gross, tax_rate, tax, net, employer_fee_rate, employer_fee)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [run!.id, e.id, calc.baseSalary, calc.additions, calc.deductions, calc.gross, calc.taxRate, calc.tax, calc.net, calc.employerFeeRate, calc.employerFee]);
    }
    await updateTotals(c, run!.id);
    await audit(req, 'payroll.create', 'payroll_run', run!.id, { period: b.period }, c);
    return run!.id as number;
  });
  res.status(201).json({ data: await loadRun(pool, req.company!.id, id) });
}));

const slipSchema = z.object({
  additions: z.number().int().min(-1e9).max(1e9).optional(),
  deductions: z.number().int().min(0).max(1e9).optional(),
  tax: z.number().int().min(0).max(1e9).nullable().optional(),
  employerFeeRate: z.number().min(0).max(40).optional(),
});

router.patch('/payroll-runs/:id/payslips/:slipId', requireRole('accountant'), validate(slipSchema), ah(async (req, res) => {
  const runId = idParam(req.params.id);
  const slipId = idParam(req.params.slipId);
  const b = valid<z.infer<typeof slipSchema>>(req);
  await transaction(async (c) => {
    const run = await one(c, 'SELECT status FROM payroll_runs WHERE id = $1 AND company_id = $2 FOR UPDATE', [runId, req.company!.id]);
    if (!run) throw notFound('Payroll run not found');
    if (run.status !== 'draft') throw conflict('Booked payroll runs cannot be changed');
    const slip = await one(c, 'SELECT * FROM payslips WHERE id = $1 AND payroll_run_id = $2', [slipId, runId]);
    if (!slip) throw notFound('Payslip not found');
    let calc;
    try {
      calc = calculatePayslip({
        baseSalary: slip.base_salary,
        additions: b.additions ?? slip.additions,
        deductions: b.deductions ?? slip.deductions,
        taxRate: slip.tax_rate,
        employerFeeRate: b.employerFeeRate ?? slip.employer_fee_rate,
        taxOverride: b.tax,
      });
    } catch (err: any) {
      throw unprocessable(err.message);
    }
    await c.query(`UPDATE payslips SET additions = $1, deductions = $2, gross = $3, tax = $4, net = $5, employer_fee_rate = $6, employer_fee = $7 WHERE id = $8`,
      [calc.additions, calc.deductions, calc.gross, calc.tax, calc.net, calc.employerFeeRate, calc.employerFee, slipId]);
    await updateTotals(c, runId);
  });
  res.json({ data: await loadRun(pool, req.company!.id, runId) });
}));

router.delete('/payroll-runs/:id', requireRole('accountant'), ah(async (req, res) => {
  const r = await pool.query(`DELETE FROM payroll_runs WHERE id = $1 AND company_id = $2 AND status = 'draft'`, [idParam(req.params.id), req.company!.id]);
  if (!r.rowCount) throw conflict('Only draft payroll runs can be deleted');
  res.status(204).end();
}));

/** Book the run: salaries, employer contributions, withheld tax and payout. */
router.post('/payroll-runs/:id/book', requireRole('accountant'), validate(z.object({ bankAccount: accountNumber.default(DEFAULT_BANK_ACCOUNT) })), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const { bankAccount } = valid<{ bankAccount: number }>(req);
  await transaction(async (c) => {
    const run = await one(c, 'SELECT * FROM payroll_runs WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.company!.id]);
    if (!run) throw notFound('Payroll run not found');
    if (run.status !== 'draft') throw conflict('The payroll run is already booked');
    const sums = await one(c, 'SELECT COALESCE(SUM(deductions), 0) AS deductions FROM payslips WHERE payroll_run_id = $1', [id]);
    const v = await postVoucher(c, {
      companyId: req.company!.id,
      date: run.pay_date,
      series: SERIES.payroll,
      description: `Lön ${run.period}`,
      lines: [
        { account: 7210, debit: run.total_gross, description: 'Bruttolön' },
        { account: 7510, debit: run.total_employer_fee, description: 'Arbetsgivaravgifter' },
        { account: 2710, credit: run.total_tax, description: 'Preliminärskatt' },
        { account: 2731, credit: run.total_employer_fee, description: 'Arbetsgivaravgifter' },
        { account: 1610, credit: sums!.deductions, description: 'Nettolöneavdrag' },
        { account: bankAccount, credit: run.total_net, description: 'Utbetald nettolön' },
      ],
      sourceType: 'payroll',
      sourceId: id,
      userId: req.session!.user.id,
    });
    await c.query(`UPDATE payroll_runs SET status = 'booked', voucher_id = $1 WHERE id = $2`, [v.id, id]);
    await audit(req, 'payroll.book', 'payroll_run', id, { voucher: `${v.series}${v.number}` }, c);
  });
  res.json({ data: await loadRun(pool, req.company!.id, id) });
}));

/**
 * Summary for the monthly arbetsgivardeklaration (AGI): per employee
 * (individuppgift) gross pay (ruta 011), tax withheld (ruta 001), and the
 * employer totals (huvuduppgift). Amounts in whole kronor as filed.
 */
router.get('/payroll-runs/:id/agi', requireRole('accountant'), ah(async (req, res) => {
  const run = await loadRun(pool, req.company!.id, idParam(req.params.id));
  if (!run) throw notFound('Payroll run not found');
  const kr = (ore: number) => Math.trunc(ore / 100);
  const byRate = new Map<number, { base: number; fee: number }>();
  for (const p of run.payslips) {
    const r = byRate.get(p.employerFeeRate) || { base: 0, fee: 0 };
    r.base += p.gross;
    r.fee += p.employerFee;
    byRate.set(p.employerFeeRate, r);
  }
  res.json({
    data: {
      period: run.period,
      redovisningsperiod: run.period.replace('-', ''),
      orgNumber: req.company!.orgNumber,
      individuals: run.payslips.map((p) => ({
        personalNumber: p.personalNumber, name: p.name, grossPay: kr(p.gross), taxWithheld: kr(p.tax), employerFeeRate: p.employerFeeRate,
      })),
      employer: {
        totalTaxWithheld: kr(run.totals.tax),
        totalEmployerFees: kr(run.totals.employerFee),
        feeBases: [...byRate.entries()].map(([rate, v]) => ({ rate, base: kr(v.base), fee: kr(v.fee) })),
        totalToPay: kr(run.totals.tax) + kr(run.totals.employerFee),
      },
    },
  });
}));

export default router;
