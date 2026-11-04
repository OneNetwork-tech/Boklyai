/**
 * Financial reports computed from the ledger.
 *
 * Sign convention: balance = debit − credit. Balance-sheet accounts (1xxx–2xxx)
 * carry over between fiscal years (opening balance = everything before the
 * period); result accounts (3xxx–8xxx) start from zero each fiscal year.
 */
import type { PoolClient } from 'pg';
import { Db, one, query } from '../db';
import { accountClass } from '../data/bas';
import { unprocessable } from '../utils/errors';

export interface AccountBalance {
  number: number;
  name: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

async function fiscalYearOf(db: Db, companyId: number, date: string) {
  const fy = await one(db, 'SELECT id, start_date, end_date FROM fiscal_years WHERE company_id = $1 AND $2::date BETWEEN start_date AND end_date', [companyId, date]);
  if (!fy) throw unprocessable(`No fiscal year covers ${date}`);
  return fy as { id: number; start_date: string; end_date: string };
}

/** Saldobalans: opening, period movement and closing per account. */
export async function trialBalance(db: Db, companyId: number, from: string, to: string, opts: { excludeSources?: string[] } = {}): Promise<AccountBalance[]> {
  const fy = await fiscalYearOf(db, companyId, from);
  const exclude = opts.excludeSources ?? [];
  const rows = await query(db, `
    SELECT a.number, a.name,
      COALESCE(SUM(CASE WHEN v.date < $2 AND (a.number < 3000 OR v.date >= $4) THEN l.debit - l.credit END), 0) AS opening,
      COALESCE(SUM(CASE WHEN v.date BETWEEN $2 AND $3 THEN l.debit END), 0) AS debit,
      COALESCE(SUM(CASE WHEN v.date BETWEEN $2 AND $3 THEN l.credit END), 0) AS credit
      FROM accounts a
      JOIN voucher_lines l ON l.account_id = a.id
      JOIN vouchers v ON v.id = l.voucher_id
     WHERE a.company_id = $1 AND v.date <= $3 AND NOT (v.source_type = ANY($5::text[]))
     GROUP BY a.number, a.name
     ORDER BY a.number`, [companyId, from, to, fy.start_date, exclude]);
  return rows
    .map((r) => ({ number: r.number, name: r.name, opening: r.opening, debit: r.debit, credit: r.credit, closing: r.opening + r.debit - r.credit }))
    .filter((r) => r.opening !== 0 || r.debit !== 0 || r.credit !== 0);
}

interface Section {
  key: string;
  label: string;
  accounts: { number: number; name: string; amount: number }[];
  total: number;
}

function section(key: string, label: string, balances: AccountBalance[], lo: number, hi: number, field: 'closing' | 'movement', sign: 1 | -1): Section {
  const accounts = balances
    .filter((b) => b.number >= lo && b.number <= hi)
    .map((b) => ({ number: b.number, name: b.name, amount: sign * (field === 'closing' ? b.closing : b.debit - b.credit) }))
    .filter((a) => a.amount !== 0);
  return { key, label, accounts, total: accounts.reduce((s, a) => s + a.amount, 0) };
}

/** Resultaträkning (cost-by-nature layout, K2/K3). Amounts: income positive, costs negative. */
export async function incomeStatement(db: Db, companyId: number, from: string, to: string) {
  const tb = await trialBalance(db, companyId, from, to);
  const pl = tb.filter((b) => b.number >= 3000 && b.number !== 8999);
  const s = {
    netSales: section('netSales', 'Nettoomsättning', pl, 3000, 3799, 'movement', -1),
    otherIncome: section('otherIncome', 'Övriga rörelseintäkter', pl, 3800, 3999, 'movement', -1),
    goods: section('goods', 'Råvaror och förnödenheter / handelsvaror', pl, 4000, 4999, 'movement', -1),
    external: section('external', 'Övriga externa kostnader', pl, 5000, 6999, 'movement', -1),
    personnel: section('personnel', 'Personalkostnader', pl, 7000, 7699, 'movement', -1),
    depreciation: section('depreciation', 'Av- och nedskrivningar', pl, 7700, 7899, 'movement', -1),
    otherOperating: section('otherOperating', 'Övriga rörelsekostnader', pl, 7900, 7999, 'movement', -1),
    financial: section('financial', 'Finansiella poster', pl, 8000, 8799, 'movement', -1),
    appropriations: section('appropriations', 'Bokslutsdispositioner', pl, 8800, 8899, 'movement', -1),
    tax: section('tax', 'Skatt', pl, 8900, 8998, 'movement', -1),
  };
  const operatingIncome = s.netSales.total + s.otherIncome.total;
  const operatingResult = operatingIncome + s.goods.total + s.external.total + s.personnel.total + s.depreciation.total + s.otherOperating.total;
  const resultAfterFinancial = operatingResult + s.financial.total;
  const resultBeforeTax = resultAfterFinancial + s.appropriations.total;
  const netResult = resultBeforeTax + s.tax.total;
  return {
    from, to, sections: Object.values(s), operatingIncome, operatingResult, resultAfterFinancial, resultBeforeTax, netResult,
  };
}

/** Balansräkning at a date. Assets positive; equity & liabilities positive. */
export async function balanceSheet(db: Db, companyId: number, date: string) {
  const fy = await fiscalYearOf(db, companyId, date);
  const tb = await trialBalance(db, companyId, fy.start_date, date);
  const bs = tb.filter((b) => b.number < 3000);
  // Result not yet transferred to equity (all result accounts incl. 8999 for this year).
  const unbooked = -tb.filter((b) => b.number >= 3000).reduce((s, b) => s + b.closing, 0);
  const assets = [
    section('fixedAssets', 'Anläggningstillgångar', bs, 1000, 1399, 'closing', 1),
    section('currentAssets', 'Omsättningstillgångar', bs, 1400, 1999, 'closing', 1),
  ];
  const equity = section('equity', 'Eget kapital', bs, 2000, 2099, 'closing', -1);
  if (unbooked !== 0) {
    equity.accounts.push({ number: 0, name: 'Beräknat resultat (ej bokfört)', amount: unbooked });
    equity.total += unbooked;
  }
  const liabilities = [
    equity,
    section('untaxedReserves', 'Obeskattade reserver', bs, 2100, 2199, 'closing', -1),
    section('provisions', 'Avsättningar', bs, 2200, 2299, 'closing', -1),
    section('longTerm', 'Långfristiga skulder', bs, 2300, 2399, 'closing', -1),
    section('shortTerm', 'Kortfristiga skulder', bs, 2400, 2999, 'closing', -1),
  ];
  const totalAssets = assets.reduce((s, x) => s + x.total, 0);
  const totalEquityAndLiabilities = liabilities.reduce((s, x) => s + x.total, 0);
  return {
    date, fiscalYear: { start: fy.start_date, end: fy.end_date }, assets, equityAndLiabilities: liabilities, totalAssets, totalEquityAndLiabilities,
    balanced: totalAssets === totalEquityAndLiabilities,
  };
}

/** Huvudbok for one account: opening balance and every line with running balance. */
export async function generalLedger(db: Db, companyId: number, account: number, from: string, to: string) {
  const fy = await fiscalYearOf(db, companyId, from);
  const acc = await one(db, 'SELECT id, number, name FROM accounts WHERE company_id = $1 AND number = $2', [companyId, account]);
  if (!acc) throw unprocessable(`Account ${account} not found`);
  const open = await one(db, `
    SELECT COALESCE(SUM(l.debit - l.credit), 0) AS balance FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
     WHERE l.account_id = $1 AND v.date < $2 AND ($4 OR v.date >= $3)`, [acc.id, from, fy.start_date, account < 3000]);
  const lines = await query(db, `
    SELECT v.id AS voucher_id, v.series || v.number AS ref, v.date, v.description, l.description AS line_text, l.debit, l.credit
      FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id
     WHERE l.account_id = $1 AND v.date BETWEEN $2 AND $3 ORDER BY v.date, v.id, l.line_no`, [acc.id, from, to]);
  let running = open!.balance;
  return {
    account: { number: acc.number, name: acc.name, class: accountClass(acc.number) },
    from,
    to,
    opening: open!.balance,
    lines: lines.map((l) => {
      running += l.debit - l.credit;
      return { voucherId: l.voucher_id, ref: l.ref, date: l.date, description: l.line_text || l.description, debit: l.debit, credit: l.credit, balance: running };
    }),
    closing: running,
  };
}

/**
 * Momsdeklaration (SKV 4700) boxes for a period, from ledger movements on
 * accounts tagged with VAT codes. The VAT settlement voucher itself is excluded.
 */
export async function vatReport(db: Db, companyId: number, from: string, to: string) {
  const rows = await query(db, `
    SELECT a.vat_code, COALESCE(SUM(l.debit - l.credit), 0) AS balance
      FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
     WHERE v.company_id = $1 AND v.date BETWEEN $2 AND $3 AND a.vat_code IS NOT NULL AND v.source_type <> 'vat'
     GROUP BY a.vat_code`, [companyId, from, to]);
  const b = (code: string) => rows.find((r) => r.vat_code === code)?.balance ?? 0;
  const ore = {
    box05: -(b('F25') + b('F12') + b('F6')),
    box10: -b('U25'),
    box11: -b('U12'),
    box12: -b('U6'),
    box42: -b('F0'),
    box48: b('IN'),
  };
  const box49 = ore.box10 + ore.box11 + ore.box12 - ore.box48;
  // The return is filed in whole kronor (öre are dropped).
  const kr = (v: number) => Math.trunc(v / 100);
  const krBoxes = {
    box05: kr(ore.box05), box10: kr(ore.box10), box11: kr(ore.box11), box12: kr(ore.box12), box42: kr(ore.box42), box48: kr(ore.box48),
  };
  return {
    from,
    to,
    ore: { ...ore, box49 },
    kronor: { ...krBoxes, box49: krBoxes.box10 + krBoxes.box11 + krBoxes.box12 - krBoxes.box48 },
    labels: {
      box05: 'Momspliktig försäljning som inte ingår i ruta 06, 07 eller 08',
      box10: 'Utgående moms 25 %',
      box11: 'Utgående moms 12 %',
      box12: 'Utgående moms 6 %',
      box42: 'Övrig försäljning m.m. (momsfri)',
      box48: 'Ingående moms att dra av',
      box49: 'Moms att betala eller få tillbaka',
    },
  };
}

/** Lines that move the period's VAT balances to 2650 Redovisningskonto för moms. */
export async function vatSettlementLines(c: PoolClient, companyId: number, from: string, to: string) {
  const rows = await query(c, `
    SELECT a.number, COALESCE(SUM(l.debit - l.credit), 0) AS balance
      FROM voucher_lines l JOIN vouchers v ON v.id = l.voucher_id JOIN accounts a ON a.id = l.account_id
     WHERE v.company_id = $1 AND v.date BETWEEN $2 AND $3 AND a.vat_code IN ('U25', 'U12', 'U6', 'IN') AND v.source_type <> 'vat'
     GROUP BY a.number HAVING SUM(l.debit - l.credit) <> 0`, [companyId, from, to]);
  const lines = rows.map((r) => (r.balance > 0 ? { account: r.number, credit: r.balance } : { account: r.number, debit: -r.balance }));
  const net = rows.reduce((s, r) => s + r.balance, 0); // negative = VAT to pay
  if (net !== 0) lines.push(net < 0 ? { account: 2650, credit: -net } : { account: 2650, debit: net });
  return { lines, toPay: -net };
}
