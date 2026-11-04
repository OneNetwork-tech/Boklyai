import type { PoolClient } from 'pg';
import { one, query, Db } from '../db';
import {
  OUTPUT_VAT_ACCOUNT, RECEIVABLES_ACCOUNT, SALES_ACCOUNT,
} from '../data/bas';
import { lineNet, vatOnNet } from '../utils/money';
import { ocrReference } from '../utils/swedish';
import { conflict, notFound, unprocessable, badRequest } from '../utils/errors';
import { nextNumber, postVoucher, SERIES } from './ledger';
import { consolidate, signed } from './posting';

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number; // öre, excl. VAT
  vatRate: 0 | 6 | 12 | 25;
  account?: number;
}

export function computeLines(lines: InvoiceLineInput[]) {
  return lines.map((l, i) => {
    const account = l.account ?? SALES_ACCOUNT[l.vatRate];
    if (account < 3000 || account > 3999) throw badRequest(`Line ${i + 1}: sales must be booked on a 3xxx revenue account`);
    const net = lineNet(l.quantity, l.unitPrice);
    return {
      lineNo: i + 1,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit || 'st',
      unitPrice: l.unitPrice,
      vatRate: l.vatRate,
      account,
      net,
      vat: vatOnNet(net, l.vatRate),
    };
  });
}

export async function replaceInvoiceLines(c: PoolClient, invoiceId: number, lines: ReturnType<typeof computeLines>) {
  await c.query('DELETE FROM invoice_lines WHERE invoice_id = $1', [invoiceId]);
  for (const l of lines) {
    await c.query(`INSERT INTO invoice_lines (invoice_id, line_no, description, quantity, unit, unit_price, vat_rate, account_number, net_amount, vat_amount)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [invoiceId, l.lineNo, l.description, l.quantity, l.unit, l.unitPrice, l.vatRate, l.account, l.net, l.vat]);
  }
  const net = lines.reduce((s, l) => s + l.net, 0);
  const vat = lines.reduce((s, l) => s + l.vat, 0);
  await c.query('UPDATE invoices SET net_amount = $1, vat_amount = $2, total_amount = $3, updated_at = now() WHERE id = $4',
    [net, vat, net + vat, invoiceId]);
}

/** Ledger lines for an invoice (or credit note, whose amounts are negative). */
function invoicePosting(lines: any[], total: number) {
  const posting = [signed(RECEIVABLES_ACCOUNT, total)];
  for (const l of lines) {
    posting.push(signed(l.account_number, -l.net_amount));
    if (l.vat_amount) posting.push(signed(OUTPUT_VAT_ACCOUNT[l.vat_rate], -l.vat_amount));
  }
  return consolidate(posting);
}

/** Issue a draft: allocate the number and OCR reference and post to the ledger. */
export async function issueInvoice(c: PoolClient, companyId: number, invoiceId: number, userId: number) {
  const inv = await one(c, 'SELECT * FROM invoices WHERE id = $1 AND company_id = $2 FOR UPDATE', [invoiceId, companyId]);
  if (!inv) throw notFound('Invoice not found');
  if (inv.status !== 'draft') throw conflict('Only drafts can be issued');
  const lines = await query(c, 'SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY line_no', [invoiceId]);
  if (!lines.length) throw unprocessable('Add at least one line before issuing');
  if (inv.total_amount === 0) throw unprocessable('An invoice cannot total 0 kr');

  const number = await nextNumber(c, companyId, 'invoice', 1001);
  const ocr = ocrReference(number);
  const customer = await one(c, 'SELECT name FROM customers WHERE id = $1', [inv.customer_id]);
  const label = inv.kind === 'credit_note' ? 'Kreditfaktura' : 'Kundfaktura';
  const voucher = await postVoucher(c, {
    companyId,
    date: inv.issue_date,
    series: SERIES.invoice,
    description: `${label} ${number} – ${customer!.name}`,
    lines: invoicePosting(lines, inv.total_amount),
    sourceType: 'invoice',
    sourceId: invoiceId,
    userId,
  });
  await c.query(`UPDATE invoices SET status = 'issued', invoice_number = $1, ocr_reference = $2, voucher_id = $3,
                   issued_at = now(), updated_at = now() WHERE id = $4`, [number, ocr, voucher.id, invoiceId]);
  return { number, ocr, voucher };
}

/** Register an incoming payment against an issued invoice. */
export async function registerInvoicePayment(
  c: PoolClient,
  companyId: number,
  invoiceId: number,
  p: { date: string; amount: number; account: number; bankTransactionId?: number | null },
  userId: number,
) {
  const inv = await one(c, `SELECT i.*, cu.name AS customer_name FROM invoices i JOIN customers cu ON cu.id = i.customer_id
                            WHERE i.id = $1 AND i.company_id = $2 FOR UPDATE OF i`, [invoiceId, companyId]);
  if (!inv) throw notFound('Invoice not found');
  if (inv.kind !== 'invoice') throw unprocessable('Payments are registered on invoices, not credit notes');
  if (inv.status !== 'issued') throw conflict(inv.status === 'paid' ? 'The invoice is already paid' : 'Only issued invoices can be paid');
  const remaining = inv.total_amount - inv.paid_amount;
  if (p.amount > remaining) throw unprocessable(`The payment exceeds the remaining amount (${remaining} öre)`);
  if (p.date < inv.issue_date) throw unprocessable('The payment date is before the invoice date');
  if (p.account < 1900 || p.account > 1999) throw badRequest('Payments must be booked on a cash/bank account (19xx)');

  const voucher = await postVoucher(c, {
    companyId,
    date: p.date,
    series: SERIES.invoicePayment,
    description: `Inbetalning faktura ${inv.invoice_number} – ${inv.customer_name}`,
    lines: [{ account: p.account, debit: p.amount }, { account: RECEIVABLES_ACCOUNT, credit: p.amount }],
    sourceType: 'invoice_payment',
    sourceId: invoiceId,
    userId,
  });
  const payment = await one(c, `INSERT INTO invoice_payments (company_id, invoice_id, date, amount, account_number, voucher_id, bank_transaction_id)
                               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
  [companyId, invoiceId, p.date, p.amount, p.account, voucher.id, p.bankTransactionId ?? null]);
  const paid = inv.paid_amount + p.amount;
  await c.query('UPDATE invoices SET paid_amount = $1, status = $2, updated_at = now() WHERE id = $3',
    [paid, paid === inv.total_amount ? 'paid' : 'issued', invoiceId]);
  return { paymentId: payment!.id, voucher };
}

/** Create and issue a full credit note for an unpaid invoice. */
export async function creditInvoice(c: PoolClient, companyId: number, invoiceId: number, date: string, userId: number) {
  const inv = await one(c, 'SELECT * FROM invoices WHERE id = $1 AND company_id = $2 FOR UPDATE', [invoiceId, companyId]);
  if (!inv) throw notFound('Invoice not found');
  if (inv.kind !== 'invoice' || inv.status !== 'issued') throw conflict('Only issued, unpaid invoices can be credited');
  if (inv.paid_amount > 0) throw unprocessable('The invoice is partly paid; refund or settle the paid part first');
  if (date < inv.issue_date) throw unprocessable('The credit note cannot be dated before the invoice');

  const credit = await one(c, `
    INSERT INTO invoices (company_id, customer_id, kind, credits_invoice_id, issue_date, due_date, our_reference, your_reference, notes, created_by)
    VALUES ($1, $2, 'credit_note', $3, $4, $4, $5, $6, $7, $8) RETURNING id`,
  [companyId, inv.customer_id, invoiceId, date, inv.our_reference, inv.your_reference, `Kreditering av faktura ${inv.invoice_number}`, userId]);
  await c.query(`INSERT INTO invoice_lines (invoice_id, line_no, description, quantity, unit, unit_price, vat_rate, account_number, net_amount, vat_amount)
                 SELECT $1, line_no, description, -quantity, unit, unit_price, vat_rate, account_number, -net_amount, -vat_amount
                   FROM invoice_lines WHERE invoice_id = $2`, [credit!.id, invoiceId]);
  await c.query('UPDATE invoices SET net_amount = $1, vat_amount = $2, total_amount = $3 WHERE id = $4',
    [-inv.net_amount, -inv.vat_amount, -inv.total_amount, credit!.id]);
  const issued = await issueInvoice(c, companyId, credit!.id, userId);
  // Both documents are settled against each other.
  await c.query(`UPDATE invoices SET status = 'credited', updated_at = now() WHERE id = ANY($1::bigint[])`, [[invoiceId, credit!.id]]);
  return { creditNoteId: credit!.id, number: issued.number };
}

export async function loadInvoice(db: Db, companyId: number, id: number) {
  const inv = await one(db, `
    SELECT i.*, c.name AS customer_name, c.customer_number, c.org_number AS customer_org, c.vat_number AS customer_vat,
           c.address AS customer_address, c.postal_code AS customer_postal, c.city AS customer_city, c.email AS customer_email,
           v.series || v.number AS voucher_ref, orig.invoice_number AS credits_number
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN vouchers v ON v.id = i.voucher_id
      LEFT JOIN invoices orig ON orig.id = i.credits_invoice_id
     WHERE i.id = $1 AND i.company_id = $2`, [id, companyId]);
  if (!inv) return null;
  const lines = await query(db, 'SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY line_no', [id]);
  const payments = await query(db, `SELECT p.*, v.series || v.number AS voucher_ref FROM invoice_payments p
                                    JOIN vouchers v ON v.id = p.voucher_id WHERE p.invoice_id = $1 ORDER BY p.date, p.id`, [id]);
  return {
    ...invoiceSummary(inv),
    ourReference: inv.our_reference,
    yourReference: inv.your_reference,
    notes: inv.notes,
    voucherId: inv.voucher_id,
    voucherRef: inv.voucher_ref,
    creditsInvoiceId: inv.credits_invoice_id,
    creditsNumber: inv.credits_number,
    customer: {
      id: inv.customer_id,
      number: inv.customer_number,
      name: inv.customer_name,
      orgNumber: inv.customer_org,
      vatNumber: inv.customer_vat,
      address: inv.customer_address,
      postalCode: inv.customer_postal,
      city: inv.customer_city,
      email: inv.customer_email,
    },
    lines: lines.map((l) => ({
      lineNo: l.line_no, description: l.description, quantity: l.quantity, unit: l.unit, unitPrice: l.unit_price,
      vatRate: l.vat_rate, account: l.account_number, net: l.net_amount, vat: l.vat_amount,
    })),
    vatSummary: [25, 12, 6, 0].map((rate) => ({
      rate,
      net: lines.filter((l) => l.vat_rate === rate).reduce((s, l) => s + l.net_amount, 0),
      vat: lines.filter((l) => l.vat_rate === rate).reduce((s, l) => s + l.vat_amount, 0),
    })).filter((r) => r.net !== 0),
    payments: payments.map((p) => ({ id: p.id, date: p.date, amount: p.amount, account: p.account_number, voucherRef: p.voucher_ref })),
  };
}

export function invoiceSummary(i: any) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return {
    id: i.id,
    kind: i.kind,
    number: i.invoice_number,
    status: i.status,
    overdue: i.status === 'issued' && i.due_date < todayStr,
    customerId: i.customer_id,
    customerName: i.customer_name,
    issueDate: i.issue_date,
    dueDate: i.due_date,
    ocr: i.ocr_reference,
    net: i.net_amount,
    vat: i.vat_amount,
    total: i.total_amount,
    paid: i.paid_amount,
    // Credited invoices/credit notes settle each other, so nothing remains.
    remaining: i.status === 'issued' ? i.total_amount - i.paid_amount : 0,
  };
}
