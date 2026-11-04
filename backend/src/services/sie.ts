/**
 * SIE 4 export (Standard Import Export, sie.se). Type 4 = full transactions.
 * The file is encoded in IBM PC 8-bit extended ASCII (code page 437, "PC8").
 */
import { Db, one, query } from '../db';
import { accountClass } from '../data/bas';
import { notFound } from '../utils/errors';

const CP437: Record<string, number> = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ä: 0x84, à: 0x85, å: 0x86, ç: 0x87, ê: 0x88, ë: 0x89, è: 0x8a, ï: 0x8b, î: 0x8c, ì: 0x8d,
  Ä: 0x8e, Å: 0x8f, É: 0x90, æ: 0x91, Æ: 0x92, ô: 0x93, ö: 0x94, ò: 0x95, û: 0x96, ù: 0x97, ÿ: 0x98, Ö: 0x99, Ü: 0x9a, ø: 0x9b,
  '£': 0x9c, Ø: 0x9d, á: 0xa0, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, '§': 0x15,
};

export function encodeCp437(text: string): Buffer {
  const bytes: number[] = [];
  for (const ch of text.normalize('NFC')) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) bytes.push(code);
    else bytes.push(CP437[ch] ?? 0x3f); // '?'
  }
  return Buffer.from(bytes);
}

const q = (s: string) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`;
const d = (iso: string) => iso.replace(/-/g, '');
const amt = (ore: number) => {
  const sign = ore < 0 ? '-' : '';
  const abs = Math.abs(ore);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
};

function ktyp(number: number): string {
  switch (accountClass(number)) {
    case 'asset': return 'T';
    case 'equity':
    case 'liability': return 'S';
    case 'revenue': return 'I';
    default: return 'K';
  }
}

export async function exportSie4(db: Db, companyId: number, fiscalYearId: number, programVersion = '1.0'): Promise<{ filename: string; content: Buffer }> {
  const company = await one(db, 'SELECT * FROM companies WHERE id = $1', [companyId]);
  const fy = await one(db, 'SELECT * FROM fiscal_years WHERE id = $1 AND company_id = $2', [fiscalYearId, companyId]);
  if (!company || !fy) throw notFound('Fiscal year not found');
  const accounts = await query(db, 'SELECT id, number, name FROM accounts WHERE company_id = $1 ORDER BY number', [companyId]);
  const balances = await query(db, `
    SELECT a.number,
      COALESCE(SUM(CASE WHEN v.date < $2 THEN l.debit - l.credit END), 0) AS ib,
      COALESCE(SUM(CASE WHEN v.date <= $3 THEN l.debit - l.credit END), 0) AS ub,
      COALESCE(SUM(CASE WHEN v.date BETWEEN $2 AND $3 THEN l.debit - l.credit END), 0) AS res
      FROM accounts a JOIN voucher_lines l ON l.account_id = a.id JOIN vouchers v ON v.id = l.voucher_id
     WHERE a.company_id = $1 GROUP BY a.number ORDER BY a.number`, [companyId, fy.start_date, fy.end_date]);
  const vouchers = await query(db, `SELECT id, series, number, date, description, created_at FROM vouchers
                                    WHERE company_id = $1 AND fiscal_year_id = $2 ORDER BY series, number`, [companyId, fiscalYearId]);
  const lines = await query(db, `SELECT l.voucher_id, a.number, l.debit, l.credit, l.description FROM voucher_lines l
                                 JOIN accounts a ON a.id = l.account_id JOIN vouchers v ON v.id = l.voucher_id
                                 WHERE v.company_id = $1 AND v.fiscal_year_id = $2 ORDER BY l.voucher_id, l.line_no`, [companyId, fiscalYearId]);
  const byVoucher = new Map<number, any[]>();
  for (const l of lines) {
    if (!byVoucher.has(l.voucher_id)) byVoucher.set(l.voucher_id, []);
    byVoucher.get(l.voucher_id)!.push(l);
  }

  const out: string[] = [
    '#FLAGGA 0',
    `#PROGRAM ${q('BoklyAI')} ${q(programVersion)}`,
    '#FORMAT PC8',
    `#GEN ${d(new Date().toISOString().slice(0, 10))}`,
    '#SIETYP 4',
    `#ORGNR ${company.org_number}`,
    `#FNAMN ${q(company.name)}`,
    `#ADRESS ${q('')} ${q(company.address)} ${q(`${company.postal_code} ${company.city}`.trim())} ${q(company.phone)}`,
    `#RAR 0 ${d(fy.start_date)} ${d(fy.end_date)}`,
    '#KPTYP BAS2014',
    '#VALUTA SEK',
  ];
  for (const a of accounts) {
    out.push(`#KONTO ${a.number} ${q(a.name)}`);
    out.push(`#KTYP ${a.number} ${ktyp(a.number)}`);
  }
  for (const b of balances) {
    if (b.number < 3000) {
      if (b.ib) out.push(`#IB 0 ${b.number} ${amt(b.ib)}`);
      if (b.ub) out.push(`#UB 0 ${b.number} ${amt(b.ub)}`);
    } else if (b.res) {
      out.push(`#RES 0 ${b.number} ${amt(b.res)}`);
    }
  }
  for (const v of vouchers) {
    out.push(`#VER ${q(v.series)} ${q(String(v.number))} ${d(v.date)} ${q(v.description)} ${d(new Date(v.created_at).toISOString().slice(0, 10))}`);
    out.push('{');
    for (const l of byVoucher.get(v.id) || []) {
      out.push(`   #TRANS ${l.number} {} ${amt(l.debit - l.credit)}${l.description ? ` "" ${q(l.description)}` : ''}`);
    }
    out.push('}');
  }
  const filename = `SIE4_${company.org_number.replace('-', '')}_${fy.start_date.slice(0, 4)}.se`;
  return { filename, content: encodeCp437(`${out.join('\r\n')}\r\n`) };
}
