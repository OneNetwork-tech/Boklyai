import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { one, pool, query, transaction } from '../db';
import { INPUT_VAT_ACCOUNT, OUTPUT_VAT_ACCOUNT } from '../data/bas';
import { requireRole } from '../middleware/auth';
import {
  accountNumber, idParam, text, validate, valid, vatRate,
} from '../middleware/validate';
import { audit } from '../services/audit';
import { parseBankCsv } from '../services/bankImport';
import { learn, suggestAccounts, suggestMatches } from '../services/categorizer';
import { postVoucher, SERIES } from '../services/ledger';
import { registerInvoicePayment } from '../services/sales';
import { payBill } from '../services/purchases';
import { splitGross } from '../utils/money';
import { ah, badRequest, conflict, notFound, unprocessable } from '../utils/errors';
import { isoDate } from '../middleware/validate';

const router = Router({ mergeParams: true });
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// --- Bank accounts -----------------------------------------------------------------

const bankAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bankName: text(100).optional(),
  clearingNumber: z.string().trim().regex(/^(\d{4,5})?$/, 'Clearing number is 4–5 digits').optional(),
  accountNumber: text(30).optional(),
  iban: text(34).optional(),
  ledgerAccount: accountNumber.refine((n) => n >= 1900 && n <= 1999, 'Bank accounts use 19xx ledger accounts').optional(),
});

function bankAccountJson(b: any) {
  return {
    id: b.id, name: b.name, bankName: b.bank_name, clearingNumber: b.clearing_number, accountNumber: b.account_number, iban: b.iban,
    ledgerAccount: b.ledger_account_number, ledgerBalance: b.ledger_balance ?? undefined, unmatched: b.unmatched ?? undefined,
  };
}

router.get('/bank-accounts', requireRole('viewer'), ah(async (req, res) => {
  const rows = await query(pool, `
    SELECT b.*,
      COALESCE((SELECT SUM(l.debit - l.credit) FROM voucher_lines l JOIN accounts a ON a.id = l.account_id
                 WHERE a.company_id = b.company_id AND a.number = b.ledger_account_number), 0) AS ledger_balance,
      (SELECT count(*) FROM bank_transactions t WHERE t.bank_account_id = b.id AND t.status = 'unmatched') AS unmatched
      FROM bank_accounts b WHERE b.company_id = $1 ORDER BY b.id`, [req.company!.id]);
  res.json({ data: rows.map(bankAccountJson) });
}));

async function assertLedgerAccount(companyId: number, number: number) {
  if (!(await one(pool, 'SELECT 1 FROM accounts WHERE company_id = $1 AND number = $2 AND active', [companyId, number]))) {
    throw badRequest(`Ledger account ${number} does not exist in the chart of accounts`);
  }
}

router.post('/bank-accounts', requireRole('accountant'), validate(bankAccountSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof bankAccountSchema>>(req);
  await assertLedgerAccount(req.company!.id, b.ledgerAccount ?? 1930);
  const row = await one(pool, `INSERT INTO bank_accounts (company_id, name, bank_name, clearing_number, account_number, iban, ledger_account_number)
                               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
  [req.company!.id, b.name, b.bankName || '', b.clearingNumber || '', b.accountNumber || '', b.iban || '', b.ledgerAccount ?? 1930]);
  await audit(req, 'bank_account.create', 'bank_account', row!.id);
  res.status(201).json({ data: bankAccountJson(row) });
}));

router.patch('/bank-accounts/:id', requireRole('accountant'), validate(bankAccountSchema.partial()), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof bankAccountSchema>>(req);
  if (b.ledgerAccount) await assertLedgerAccount(req.company!.id, b.ledgerAccount);
  const row = await one(pool, `UPDATE bank_accounts SET name = COALESCE($1, name), bank_name = COALESCE($2, bank_name),
                                 clearing_number = COALESCE($3, clearing_number), account_number = COALESCE($4, account_number),
                                 iban = COALESCE($5, iban), ledger_account_number = COALESCE($6, ledger_account_number)
                               WHERE id = $7 AND company_id = $8 RETURNING *`,
  [b.name ?? null, b.bankName ?? null, b.clearingNumber ?? null, b.accountNumber ?? null, b.iban ?? null, b.ledgerAccount ?? null, id, req.company!.id]);
  if (!row) throw notFound('Bank account not found');
  res.json({ data: bankAccountJson(row) });
}));

// --- Import -----------------------------------------------------------------------

router.post('/bank-accounts/:id/import', requireRole('accountant'), csvUpload.single('file'), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const account = await one(pool, 'SELECT id FROM bank_accounts WHERE id = $1 AND company_id = $2', [id, req.company!.id]);
  if (!account) throw notFound('Bank account not found');
  let content: string;
  if (req.file) {
    const buf = req.file.buffer;
    // Most Swedish banks export UTF-8; some still use Windows-1252/Latin-1.
    const utf8 = buf.toString('utf8');
    content = utf8.includes('�') ? buf.toString('latin1') : utf8;
  } else if (typeof req.body?.csv === 'string') {
    content = req.body.csv;
  } else {
    throw badRequest('Upload a CSV file in the "file" field');
  }
  const parsed = parseBankCsv(content);
  if (!parsed.transactions.length) {
    throw unprocessable(parsed.errors[0]?.message || 'No transactions found in the file', parsed.errors.slice(0, 20));
  }
  const inserted = await transaction(async (c) => {
    let n = 0;
    for (const t of parsed.transactions) {
      const r = await c.query(`INSERT INTO bank_transactions (company_id, bank_account_id, date, description, amount, balance, import_hash)
                               VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (bank_account_id, import_hash) DO NOTHING`,
      [req.company!.id, id, t.date, t.description, t.amount, t.balance, t.hash]);
      n += r.rowCount || 0;
    }
    return n;
  });
  await audit(req, 'bank.import', 'bank_account', id, { imported: inserted, duplicates: parsed.transactions.length - inserted });
  res.status(201).json({
    data: { imported: inserted, duplicates: parsed.transactions.length - inserted, errors: parsed.errors.slice(0, 50) },
  });
}));

// --- Transactions -----------------------------------------------------------------

function txJson(t: any) {
  return {
    id: t.id, bankAccountId: t.bank_account_id, date: t.date, description: t.description, amount: t.amount, balance: t.balance,
    status: t.status, matchedType: t.matched_type, matchedId: t.matched_id, voucherId: t.voucher_id, voucherRef: t.voucher_ref ?? null,
  };
}

router.get('/bank-transactions', requireRole('viewer'), ah(async (req, res) => {
  const where = ['t.company_id = $1'];
  const params: unknown[] = [req.company!.id];
  const status = String(req.query.status || '');
  if (['unmatched', 'booked', 'ignored'].includes(status)) { params.push(status); where.push(`t.status = $${params.length}`); }
  if (req.query.bankAccountId) { params.push(idParam(String(req.query.bankAccountId))); where.push(`t.bank_account_id = $${params.length}`); }
  const rows = await query(pool, `SELECT t.*, v.series || v.number AS voucher_ref FROM bank_transactions t
                                  LEFT JOIN vouchers v ON v.id = t.voucher_id
                                  WHERE ${where.join(' AND ')} ORDER BY t.date DESC, t.id DESC LIMIT 500`, params);
  const withSuggestions = req.query.suggestions !== 'false';
  const data = await Promise.all(rows.map(async (t) => {
    const json: any = txJson(t);
    if (withSuggestions && t.status === 'unmatched') {
      json.suggestions = [
        ...(await suggestMatches(pool, req.company!.id, t.description, t.amount)),
        ...(await suggestAccounts(pool, req.company!.id, t.description, t.amount)),
      ];
    }
    return json;
  }));
  res.json({ data });
}));

async function lockTx(c: any, companyId: number, id: number) {
  const t = await one(c, `SELECT t.*, b.ledger_account_number FROM bank_transactions t JOIN bank_accounts b ON b.id = t.bank_account_id
                          WHERE t.id = $1 AND t.company_id = $2 FOR UPDATE OF t`, [id, companyId]);
  if (!t) throw notFound('Bank transaction not found');
  if (t.status !== 'unmatched') throw conflict('The transaction has already been handled');
  return t;
}

const matchSchema = z.object({ type: z.enum(['invoice', 'bill']), id: z.number().int().positive() });

/** Settle an open customer/supplier invoice with this bank transaction. */
router.post('/bank-transactions/:id/match', requireRole('accountant'), validate(matchSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof matchSchema>>(req);
  const result = await transaction(async (c) => {
    const t = await lockTx(c, req.company!.id, id);
    let voucherId: number;
    if (b.type === 'invoice') {
      if (t.amount <= 0) throw unprocessable('Only incoming payments can settle customer invoices');
      const r = await registerInvoicePayment(c, req.company!.id, b.id, {
        date: t.date, amount: t.amount, account: t.ledger_account_number, bankTransactionId: id,
      }, req.session!.user.id);
      voucherId = r.voucher.id;
    } else {
      if (t.amount >= 0) throw unprocessable('Only outgoing payments can settle supplier invoices');
      const v = await payBill(c, req.company!.id, b.id, {
        date: t.date, amount: -t.amount, account: t.ledger_account_number, bankTransactionId: id,
      }, req.session!.user.id);
      voucherId = v.id;
    }
    await c.query(`UPDATE bank_transactions SET status = 'booked', matched_type = $1, matched_id = $2, voucher_id = $3 WHERE id = $4`,
      [b.type, b.id, voucherId, id]);
    await audit(req, 'bank.match', 'bank_transaction', id, b, c);
    return voucherId;
  });
  res.json({ data: { voucherId: result } });
}));

const bookSchema = z.object({
  account: accountNumber,
  vatRate: vatRate.default(0),
  description: text(300).optional(),
  documentId: z.number().int().positive().optional(),
});

/** Book a bank transaction directly against an account (receipts, fees, owner transfers…). */
router.post('/bank-transactions/:id/book', requireRole('accountant'), validate(bookSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof bookSchema>>(req);
  const result = await transaction(async (c) => {
    const t = await lockTx(c, req.company!.id, id);
    if (b.account === t.ledger_account_number) throw badRequest('Choose a counter account other than the bank account itself');
    const gross = Math.abs(t.amount);
    const { net, vat } = splitGross(gross, b.vatRate);
    const description = b.description || t.description;
    let lines;
    if (t.amount < 0) {
      // Money out: expense (+ input VAT) against the bank.
      lines = [
        { account: b.account, debit: net, description },
        ...(vat ? [{ account: INPUT_VAT_ACCOUNT, debit: vat }] : []),
        { account: t.ledger_account_number, credit: gross },
      ];
    } else {
      // Money in: bank against income (+ output VAT).
      if (vat && !OUTPUT_VAT_ACCOUNT[b.vatRate]) throw badRequest('Unsupported VAT rate');
      lines = [
        { account: t.ledger_account_number, debit: gross },
        { account: b.account, credit: net, description },
        ...(vat ? [{ account: OUTPUT_VAT_ACCOUNT[b.vatRate], credit: vat }] : []),
      ];
    }
    const v = await postVoucher(c, {
      companyId: req.company!.id,
      date: t.date,
      series: SERIES.bank,
      description: description.slice(0, 200),
      lines,
      sourceType: 'bank',
      sourceId: id,
      userId: req.session!.user.id,
    });
    await c.query(`UPDATE bank_transactions SET status = 'booked', matched_type = 'account', matched_id = $1, voucher_id = $2 WHERE id = $3`,
      [b.account, v.id, id]);
    if (b.documentId) {
      const r = await c.query('UPDATE documents SET voucher_id = $1 WHERE id = $2 AND company_id = $3 AND voucher_id IS NULL', [v.id, b.documentId, req.company!.id]);
      if (!r.rowCount) throw badRequest('The document does not exist or is already attached to a voucher');
    }
    await learn(c, req.company!.id, t.description, b.account, b.vatRate);
    await audit(req, 'bank.book', 'bank_transaction', id, { account: b.account, voucher: `${v.series}${v.number}` }, c);
    return v;
  });
  res.json({ data: { voucherId: result.id, ref: `${result.series}${result.number}` } });
}));

router.post('/bank-transactions/:id/ignore', requireRole('accountant'), validate(z.object({ ignored: z.boolean().default(true) })), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const { ignored } = valid<{ ignored: boolean }>(req);
  const r = await pool.query(`UPDATE bank_transactions SET status = $1 WHERE id = $2 AND company_id = $3 AND status = $4`,
    [ignored ? 'ignored' : 'unmatched', id, req.company!.id, ignored ? 'unmatched' : 'ignored']);
  if (!r.rowCount) throw conflict('The transaction cannot be changed in its current state');
  res.json({ data: { status: ignored ? 'ignored' : 'unmatched' } });
}));

// Manually add a bank transaction (e.g. when no export is available).
const manualTxSchema = z.object({ date: isoDate, description: z.string().trim().min(1).max(300), amount: z.number().int().refine((n) => n !== 0) });
router.post('/bank-accounts/:id/transactions', requireRole('accountant'), validate(manualTxSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof manualTxSchema>>(req);
  const account = await one(pool, 'SELECT id FROM bank_accounts WHERE id = $1 AND company_id = $2', [id, req.company!.id]);
  if (!account) throw notFound('Bank account not found');
  const row = await one(pool, `INSERT INTO bank_transactions (company_id, bank_account_id, date, description, amount, import_hash)
                               VALUES ($1, $2, $3, $4, $5, 'manual:' || gen_random_uuid()) RETURNING *`, [req.company!.id, id, b.date, b.description, b.amount]);
  res.status(201).json({ data: txJson(row) });
}));

export default router;
