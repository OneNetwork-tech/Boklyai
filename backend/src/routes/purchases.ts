import { Router } from 'express';
import { z } from 'zod';
import { one, pool, query, transaction } from '../db';
import { DEFAULT_BANK_ACCOUNT } from '../data/bas';
import { requireRole } from '../middleware/auth';
import {
  accountNumber, idParam, isoDate, positiveOre, text, validate, valid, vatRate,
} from '../middleware/validate';
import { audit } from '../services/audit';
import {
  billSummary, bookBill, computeBillLines, loadBill, payBill, replaceBillLines,
} from '../services/purchases';
import { addDays, today } from '../utils/dates';
import { normalizeOrgNumber } from '../utils/swedish';
import { ah, badRequest, conflict, notFound } from '../utils/errors';

const router = Router({ mergeParams: true });

// --- Suppliers ---------------------------------------------------------------------

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  orgNumber: z.string().trim().max(20).optional().refine((v) => !v || normalizeOrgNumber(v), 'Invalid organisationsnummer'),
  vatNumber: text(20).optional(),
  email: z.union([z.literal(''), z.email().max(254)]).optional(),
  bankgiro: z.string().trim().max(20).regex(/^(\d{3,4}-?\d{4})?$/, 'Bankgiro must look like 123-4567').optional(),
  plusgiro: text(20).optional(),
  iban: text(34).optional(),
  defaultAccount: accountNumber.nullable().optional(),
  archived: z.boolean().optional(),
});

function supplierJson(s: any) {
  return {
    id: s.id, name: s.name, orgNumber: s.org_number, vatNumber: s.vat_number, email: s.email, bankgiro: s.bankgiro,
    plusgiro: s.plusgiro, iban: s.iban, defaultAccount: s.default_account_number, archived: s.archived,
    outstanding: s.outstanding ?? undefined,
  };
}

router.get('/suppliers', requireRole('viewer'), ah(async (req, res) => {
  const rows = await query(pool, `
    SELECT s.*, COALESCE((SELECT SUM(total_amount - paid_amount) FROM bills b WHERE b.supplier_id = s.id AND b.status = 'booked'), 0) AS outstanding
      FROM suppliers s WHERE s.company_id = $1 AND (NOT s.archived OR $2) ORDER BY s.name`, [req.company!.id, req.query.archived === 'true']);
  res.json({ data: rows.map(supplierJson) });
}));

router.post('/suppliers', requireRole('member'), validate(supplierSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof supplierSchema>>(req);
  const row = await one(pool, `INSERT INTO suppliers (company_id, name, org_number, vat_number, email, bankgiro, plusgiro, iban, default_account_number)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
  [req.company!.id, b.name, b.orgNumber ? normalizeOrgNumber(b.orgNumber) : '', b.vatNumber || '', b.email || '', b.bankgiro || '',
    b.plusgiro || '', b.iban || '', b.defaultAccount ?? null]);
  await audit(req, 'supplier.create', 'supplier', row!.id, { name: b.name });
  res.status(201).json({ data: supplierJson(row) });
}));

router.patch('/suppliers/:id', requireRole('member'), validate(supplierSchema.partial()), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<any>(req);
  const cols: Record<string, string> = {
    name: 'name', vatNumber: 'vat_number', email: 'email', bankgiro: 'bankgiro', plusgiro: 'plusgiro', iban: 'iban',
    defaultAccount: 'default_account_number', archived: 'archived',
  };
  const sets: string[] = [];
  const params: unknown[] = [];
  if (b.orgNumber !== undefined) { params.push(b.orgNumber ? normalizeOrgNumber(b.orgNumber) : ''); sets.push(`org_number = $${params.length}`); }
  for (const [k, col] of Object.entries(cols)) {
    if (b[k] !== undefined) { params.push(b[k]); sets.push(`${col} = $${params.length}`); }
  }
  if (!sets.length) throw badRequest('Nothing to update');
  params.push(id, req.company!.id);
  const row = await one(pool, `UPDATE suppliers SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`, params);
  if (!row) throw notFound('Supplier not found');
  res.json({ data: supplierJson(row) });
}));

// --- Supplier invoices (bills) ------------------------------------------------------

const billLine = z.object({
  description: text(300).optional(),
  account: accountNumber,
  net: z.number().int().min(0).max(1e12),
  vatRate,
  vat: z.number().int().min(0).max(1e12).optional(),
});

const billSchema = z.object({
  supplierId: z.number().int().positive(),
  supplierInvoiceNumber: text(50).optional(),
  invoiceDate: isoDate,
  dueDate: isoDate.optional(),
  paymentReference: text(50).optional(),
  notes: text(2000).optional(),
  documentId: z.number().int().positive().nullable().optional(),
  lines: z.array(billLine).max(100),
});

async function assertSupplier(c: any, companyId: number, supplierId: number) {
  if (!(await one(c, 'SELECT 1 FROM suppliers WHERE id = $1 AND company_id = $2 AND NOT archived', [supplierId, companyId]))) {
    throw badRequest('Unknown or archived supplier');
  }
}

async function assertDocument(c: any, companyId: number, documentId?: number | null) {
  if (!documentId) return;
  if (!(await one(c, 'SELECT 1 FROM documents WHERE id = $1 AND company_id = $2', [documentId, companyId]))) throw badRequest('Unknown document');
}

router.get('/bills', requireRole('viewer'), ah(async (req, res) => {
  const status = String(req.query.status || '');
  const where = ['b.company_id = $1'];
  if (status === 'overdue') where.push(`b.status = 'booked' AND b.due_date < CURRENT_DATE`);
  else if (status === 'unpaid') where.push(`b.status = 'booked'`);
  else if (['draft', 'booked', 'paid'].includes(status)) where.push(`b.status = '${status}'`);
  const rows = await query(pool, `SELECT b.*, s.name AS supplier_name FROM bills b JOIN suppliers s ON s.id = b.supplier_id
                                  WHERE ${where.join(' AND ')} ORDER BY b.due_date DESC, b.id DESC LIMIT 500`, [req.company!.id]);
  res.json({ data: rows.map(billSummary) });
}));

router.get('/bills/:id', requireRole('viewer'), ah(async (req, res) => {
  const bill = await loadBill(pool, req.company!.id, idParam(req.params.id));
  if (!bill) throw notFound('Supplier invoice not found');
  res.json({ data: bill });
}));

router.post('/bills', requireRole('member'), validate(billSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof billSchema>>(req);
  const lines = computeBillLines(b.lines);
  const dueDate = b.dueDate || addDays(b.invoiceDate, 30);
  if (dueDate < b.invoiceDate) throw badRequest('The due date cannot be before the invoice date');
  const id = await transaction(async (c) => {
    await assertSupplier(c, req.company!.id, b.supplierId);
    await assertDocument(c, req.company!.id, b.documentId);
    const bill = await one(c, `INSERT INTO bills (company_id, supplier_id, supplier_invoice_number, invoice_date, due_date, payment_reference, notes, document_id, created_by)
                              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [req.company!.id, b.supplierId, b.supplierInvoiceNumber || '', b.invoiceDate, dueDate, b.paymentReference || '', b.notes || '', b.documentId ?? null, req.session!.user.id]);
    await replaceBillLines(c, bill!.id, lines);
    await audit(req, 'bill.create', 'bill', bill!.id, undefined, c);
    return bill!.id as number;
  });
  res.status(201).json({ data: await loadBill(pool, req.company!.id, id) });
}));

router.put('/bills/:id', requireRole('member'), validate(billSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof billSchema>>(req);
  const lines = computeBillLines(b.lines);
  const dueDate = b.dueDate || addDays(b.invoiceDate, 30);
  if (dueDate < b.invoiceDate) throw badRequest('The due date cannot be before the invoice date');
  await transaction(async (c) => {
    const bill = await one(c, 'SELECT status FROM bills WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.company!.id]);
    if (!bill) throw notFound('Supplier invoice not found');
    if (bill.status !== 'draft') throw conflict('Booked supplier invoices cannot be changed');
    await assertSupplier(c, req.company!.id, b.supplierId);
    await assertDocument(c, req.company!.id, b.documentId);
    await c.query(`UPDATE bills SET supplier_id = $1, supplier_invoice_number = $2, invoice_date = $3, due_date = $4, payment_reference = $5,
                     notes = $6, document_id = $7 WHERE id = $8`,
    [b.supplierId, b.supplierInvoiceNumber || '', b.invoiceDate, dueDate, b.paymentReference || '', b.notes || '', b.documentId ?? null, id]);
    await replaceBillLines(c, id, lines);
  });
  res.json({ data: await loadBill(pool, req.company!.id, id) });
}));

router.delete('/bills/:id', requireRole('member'), ah(async (req, res) => {
  const r = await pool.query(`DELETE FROM bills WHERE id = $1 AND company_id = $2 AND status = 'draft'`, [idParam(req.params.id), req.company!.id]);
  if (!r.rowCount) throw conflict('Only drafts can be deleted');
  res.status(204).end();
}));

router.post('/bills/:id/book', requireRole('accountant'), ah(async (req, res) => {
  const id = idParam(req.params.id);
  await transaction(async (c) => {
    const v = await bookBill(c, req.company!.id, id, req.session!.user.id);
    await audit(req, 'bill.book', 'bill', id, { voucher: `${v.series}${v.number}` }, c);
  });
  res.json({ data: await loadBill(pool, req.company!.id, id) });
}));

const paymentSchema = z.object({ date: isoDate.default(() => today()), amount: positiveOre, account: accountNumber.default(DEFAULT_BANK_ACCOUNT) });

router.post('/bills/:id/payments', requireRole('accountant'), validate(paymentSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof paymentSchema>>(req);
  await transaction(async (c) => {
    const v = await payBill(c, req.company!.id, id, b, req.session!.user.id);
    await audit(req, 'bill.payment', 'bill', id, { amount: b.amount, voucher: `${v.series}${v.number}` }, c);
  });
  res.status(201).json({ data: await loadBill(pool, req.company!.id, id) });
}));

export default router;
