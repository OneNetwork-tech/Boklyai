import type { PoolClient } from 'pg';
import { one, query, Db } from '../db';
import { INPUT_VAT_ACCOUNT, PAYABLES_ACCOUNT } from '../data/bas';
import { vatOnNet } from '../utils/money';
import { badRequest, conflict, notFound, unprocessable } from '../utils/errors';
import { postVoucher, SERIES } from './ledger';
import { consolidate, signed } from './posting';

export interface BillLineInput {
  description?: string;
  account: number;
  net: number; // öre, excl. VAT
  vatRate: 0 | 6 | 12 | 25;
  vat?: number; // override when the receipt's VAT differs by rounding
}

export function computeBillLines(lines: BillLineInput[]) {
  return lines.map((l, i) => {
    if ((l.account >= 3000 && l.account < 4000) || l.account === PAYABLES_ACCOUNT || (l.account >= 2600 && l.account < 2700)) {
      throw badRequest(`Line ${i + 1}: account ${l.account} cannot be used for a purchase`);
    }
    const expected = vatOnNet(l.net, l.vatRate);
    const vat = l.vat ?? expected;
    if (l.vatRate === 0 && vat !== 0) throw badRequest(`Line ${i + 1}: VAT must be 0 at 0 %`);
    // Allow small rounding differences from the supplier's document (max 1 kr).
    if (Math.abs(vat - expected) > 100) throw badRequest(`Line ${i + 1}: VAT ${vat} öre differs too much from ${l.vatRate} % of the net amount`);
    return { lineNo: i + 1, description: l.description || '', account: l.account, net: l.net, vatRate: l.vatRate, vat };
  });
}

export async function replaceBillLines(c: PoolClient, billId: number, lines: ReturnType<typeof computeBillLines>) {
  await c.query('DELETE FROM bill_lines WHERE bill_id = $1', [billId]);
  for (const l of lines) {
    await c.query(`INSERT INTO bill_lines (bill_id, line_no, description, account_number, net_amount, vat_rate, vat_amount)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`, [billId, l.lineNo, l.description, l.account, l.net, l.vatRate, l.vat]);
  }
  const net = lines.reduce((s, l) => s + l.net, 0);
  const vat = lines.reduce((s, l) => s + l.vat, 0);
  await c.query('UPDATE bills SET net_amount = $1, vat_amount = $2, total_amount = $3, updated_at = now() WHERE id = $4', [net, vat, net + vat, billId]);
}

export async function bookBill(c: PoolClient, companyId: number, billId: number, userId: number) {
  const bill = await one(c, `SELECT b.*, s.name AS supplier_name FROM bills b JOIN suppliers s ON s.id = b.supplier_id
                             WHERE b.id = $1 AND b.company_id = $2 FOR UPDATE OF b`, [billId, companyId]);
  if (!bill) throw notFound('Supplier invoice not found');
  if (bill.status !== 'draft') throw conflict('Only drafts can be booked');
  const lines = await query(c, 'SELECT * FROM bill_lines WHERE bill_id = $1 ORDER BY line_no', [billId]);
  if (!lines.length) throw unprocessable('Add at least one line before booking');
  if (bill.total_amount <= 0) throw unprocessable('The total must be greater than 0 kr');
  const posting = [
    ...lines.map((l) => signed(l.account_number, l.net_amount, l.description)),
    signed(INPUT_VAT_ACCOUNT, bill.vat_amount),
    signed(PAYABLES_ACCOUNT, -bill.total_amount),
  ];
  const voucher = await postVoucher(c, {
    companyId,
    date: bill.invoice_date,
    series: SERIES.bill,
    description: `Leverantörsfaktura ${bill.supplier_invoice_number || ''} – ${bill.supplier_name}`.replace('  ', ' '),
    lines: consolidate(posting),
    sourceType: 'bill',
    sourceId: billId,
    userId,
  });
  await c.query(`UPDATE bills SET status = 'booked', voucher_id = $1, updated_at = now() WHERE id = $2`, [voucher.id, billId]);
  if (bill.document_id) await c.query('UPDATE documents SET voucher_id = $1 WHERE id = $2 AND voucher_id IS NULL', [voucher.id, bill.document_id]);
  return voucher;
}

export async function payBill(
  c: PoolClient,
  companyId: number,
  billId: number,
  p: { date: string; amount: number; account: number; bankTransactionId?: number | null },
  userId: number,
) {
  const bill = await one(c, `SELECT b.*, s.name AS supplier_name FROM bills b JOIN suppliers s ON s.id = b.supplier_id
                             WHERE b.id = $1 AND b.company_id = $2 FOR UPDATE OF b`, [billId, companyId]);
  if (!bill) throw notFound('Supplier invoice not found');
  if (bill.status !== 'booked') throw conflict(bill.status === 'paid' ? 'The supplier invoice is already paid' : 'Book the supplier invoice before paying it');
  const remaining = bill.total_amount - bill.paid_amount;
  if (p.amount > remaining) throw unprocessable(`The payment exceeds the remaining amount (${remaining} öre)`);
  if (p.account < 1900 || p.account > 1999) throw badRequest('Payments must be made from a cash/bank account (19xx)');
  const voucher = await postVoucher(c, {
    companyId,
    date: p.date,
    series: SERIES.billPayment,
    description: `Betalning leverantörsfaktura ${bill.supplier_invoice_number || ''} – ${bill.supplier_name}`.replace('  ', ' '),
    lines: [{ account: PAYABLES_ACCOUNT, debit: p.amount }, { account: p.account, credit: p.amount }],
    sourceType: 'bill_payment',
    sourceId: billId,
    userId,
  });
  await c.query(`INSERT INTO bill_payments (company_id, bill_id, date, amount, account_number, voucher_id, bank_transaction_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`, [companyId, billId, p.date, p.amount, p.account, voucher.id, p.bankTransactionId ?? null]);
  const paid = bill.paid_amount + p.amount;
  await c.query('UPDATE bills SET paid_amount = $1, status = $2, updated_at = now() WHERE id = $3', [paid, paid === bill.total_amount ? 'paid' : 'booked', billId]);
  return voucher;
}

export function billSummary(b: any) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return {
    id: b.id,
    supplierId: b.supplier_id,
    supplierName: b.supplier_name,
    supplierInvoiceNumber: b.supplier_invoice_number,
    status: b.status,
    overdue: b.status === 'booked' && b.due_date < todayStr,
    invoiceDate: b.invoice_date,
    dueDate: b.due_date,
    paymentReference: b.payment_reference,
    net: b.net_amount,
    vat: b.vat_amount,
    total: b.total_amount,
    paid: b.paid_amount,
    remaining: b.status === 'draft' ? b.total_amount : b.total_amount - b.paid_amount,
    documentId: b.document_id,
  };
}

export async function loadBill(db: Db, companyId: number, id: number) {
  const b = await one(db, `SELECT b.*, s.name AS supplier_name, s.bankgiro AS supplier_bankgiro, s.plusgiro AS supplier_plusgiro,
                                  v.series || v.number AS voucher_ref
                             FROM bills b JOIN suppliers s ON s.id = b.supplier_id LEFT JOIN vouchers v ON v.id = b.voucher_id
                            WHERE b.id = $1 AND b.company_id = $2`, [id, companyId]);
  if (!b) return null;
  const lines = await query(db, 'SELECT * FROM bill_lines WHERE bill_id = $1 ORDER BY line_no', [id]);
  const payments = await query(db, `SELECT p.*, v.series || v.number AS voucher_ref FROM bill_payments p
                                    JOIN vouchers v ON v.id = p.voucher_id WHERE p.bill_id = $1 ORDER BY p.date, p.id`, [id]);
  return {
    ...billSummary(b),
    notes: b.notes,
    voucherId: b.voucher_id,
    voucherRef: b.voucher_ref,
    supplierBankgiro: b.supplier_bankgiro,
    supplierPlusgiro: b.supplier_plusgiro,
    lines: lines.map((l) => ({
      lineNo: l.line_no, description: l.description, account: l.account_number, net: l.net_amount, vatRate: l.vat_rate, vat: l.vat_amount,
    })),
    payments: payments.map((p) => ({ id: p.id, date: p.date, amount: p.amount, account: p.account_number, voucherRef: p.voucher_ref })),
  };
}
