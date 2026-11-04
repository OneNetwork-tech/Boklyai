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
  computeLines, creditInvoice, invoiceSummary, issueInvoice, loadInvoice, registerInvoicePayment, replaceInvoiceLines,
} from '../services/sales';
import { addDays, today } from '../utils/dates';
import { normalizeOrgNumber } from '../utils/swedish';
import { ah, badRequest, conflict, notFound } from '../utils/errors';
import { nextNumber } from '../services/ledger';

const router = Router({ mergeParams: true });

// --- Customers ---------------------------------------------------------------------

const customerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  orgNumber: z.string().trim().max(20).optional().refine((v) => !v || normalizeOrgNumber(v), 'Invalid organisations-/personnummer'),
  vatNumber: text(20).optional(),
  email: z.union([z.literal(''), z.email().max(254)]).optional(),
  phone: text(50).optional(),
  address: text(200).optional(),
  postalCode: text(20).optional(),
  city: text(100).optional(),
  country: z.string().trim().length(2).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).nullable().optional(),
});

function customerJson(c: any) {
  return {
    id: c.id, number: c.customer_number, name: c.name, orgNumber: c.org_number, vatNumber: c.vat_number, email: c.email,
    phone: c.phone, address: c.address, postalCode: c.postal_code, city: c.city, country: c.country,
    paymentTermsDays: c.payment_terms_days, archived: c.archived,
    outstanding: c.outstanding ?? undefined,
  };
}

router.get('/customers', requireRole('viewer'), ah(async (req, res) => {
  const rows = await query(pool, `
    SELECT c.*, COALESCE((SELECT SUM(total_amount - paid_amount) FROM invoices i
                           WHERE i.customer_id = c.id AND i.status = 'issued'), 0) AS outstanding
      FROM customers c WHERE c.company_id = $1 AND (NOT c.archived OR $2) ORDER BY c.name`,
  [req.company!.id, req.query.archived === 'true']);
  res.json({ data: rows.map(customerJson) });
}));

router.post('/customers', requireRole('member'), validate(customerSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof customerSchema>>(req);
  const row = await transaction(async (c) => {
    const number = await nextNumber(c, req.company!.id, 'customer', 1);
    return one(c, `INSERT INTO customers (company_id, customer_number, name, org_number, vat_number, email, phone, address, postal_code, city, country, payment_terms_days)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'SE'), $12) RETURNING *`,
    [req.company!.id, number, b.name, b.orgNumber ? normalizeOrgNumber(b.orgNumber) : '', b.vatNumber || '', b.email || '', b.phone || '',
      b.address || '', b.postalCode || '', b.city || '', b.country ?? null, b.paymentTermsDays ?? null]);
  });
  await audit(req, 'customer.create', 'customer', row!.id, { name: b.name });
  res.status(201).json({ data: customerJson(row) });
}));

router.patch('/customers/:id', requireRole('member'), validate(customerSchema.partial().extend({ archived: z.boolean().optional() })), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<any>(req);
  const cols: Record<string, string> = {
    name: 'name', vatNumber: 'vat_number', email: 'email', phone: 'phone', address: 'address', postalCode: 'postal_code',
    city: 'city', country: 'country', paymentTermsDays: 'payment_terms_days', archived: 'archived',
  };
  const sets: string[] = [];
  const params: unknown[] = [];
  if (b.orgNumber !== undefined) { params.push(b.orgNumber ? normalizeOrgNumber(b.orgNumber) : ''); sets.push(`org_number = $${params.length}`); }
  for (const [k, col] of Object.entries(cols)) {
    if (b[k] !== undefined) { params.push(b[k]); sets.push(`${col} = $${params.length}`); }
  }
  if (!sets.length) throw badRequest('Nothing to update');
  params.push(id, req.company!.id);
  const row = await one(pool, `UPDATE customers SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`, params);
  if (!row) throw notFound('Customer not found');
  res.json({ data: customerJson(row) });
}));

// --- Invoices ----------------------------------------------------------------------

const lineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().gt(0).max(1e7).refine((q) => Math.abs(Math.round(q * 1000) - q * 1000) < 1e-6, 'At most 3 decimals'),
  unit: text(10).optional(),
  unitPrice: z.number().int().min(0).max(1e12),
  vatRate,
  account: accountNumber.optional(),
});

const invoiceSchema = z.object({
  customerId: z.number().int().positive(),
  issueDate: isoDate.optional(),
  dueDate: isoDate.optional(),
  ourReference: text(100).optional(),
  yourReference: text(100).optional(),
  notes: text(2000).optional(),
  lines: z.array(lineSchema).max(200),
});

const listQuery = z.object({
  status: z.enum(['draft', 'issued', 'paid', 'credited', 'overdue', 'unpaid']).optional(),
  customerId: z.coerce.number().int().optional(),
  q: z.string().trim().max(100).optional(),
});

router.get('/invoices', requireRole('viewer'), validate(listQuery, 'query'), ah(async (req, res) => {
  const q = valid<z.infer<typeof listQuery>>(req, 'query');
  const where = ['i.company_id = $1'];
  const params: unknown[] = [req.company!.id];
  if (q.status === 'overdue') where.push(`i.status = 'issued' AND i.due_date < CURRENT_DATE`);
  else if (q.status === 'unpaid') where.push(`i.status = 'issued'`);
  else if (q.status) { params.push(q.status); where.push(`i.status = $${params.length}`); }
  if (q.customerId) { params.push(q.customerId); where.push(`i.customer_id = $${params.length}`); }
  if (q.q) { params.push(q.q.replace(/[\\%_]/g, '\\$&')); where.push(`(c.name ILIKE '%' || $${params.length} || '%' OR i.invoice_number::text = $${params.length})`); }
  const rows = await query(pool, `SELECT i.*, c.name AS customer_name FROM invoices i JOIN customers c ON c.id = i.customer_id
                                  WHERE ${where.join(' AND ')} ORDER BY COALESCE(i.invoice_number, 2147483647) DESC, i.id DESC LIMIT 500`, params);
  res.json({ data: rows.map(invoiceSummary) });
}));

router.get('/invoices/:id', requireRole('viewer'), ah(async (req, res) => {
  const inv = await loadInvoice(pool, req.company!.id, idParam(req.params.id));
  if (!inv) throw notFound('Invoice not found');
  res.json({ data: inv });
}));

async function customerTerms(c: any, companyId: number, customerId: number): Promise<number> {
  const row = await one(c, `SELECT COALESCE(cu.payment_terms_days, co.payment_terms_days) AS terms
                           FROM customers cu JOIN companies co ON co.id = cu.company_id
                           WHERE cu.id = $1 AND cu.company_id = $2 AND NOT cu.archived`, [customerId, companyId]);
  if (!row) throw badRequest('Unknown or archived customer');
  return row.terms;
}

router.post('/invoices', requireRole('member'), validate(invoiceSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof invoiceSchema>>(req);
  const lines = computeLines(b.lines);
  const id = await transaction(async (c) => {
    const terms = await customerTerms(c, req.company!.id, b.customerId);
    const issueDate = b.issueDate || today();
    const dueDate = b.dueDate || addDays(issueDate, terms);
    if (dueDate < issueDate) throw badRequest('The due date cannot be before the invoice date');
    const inv = await one(c, `INSERT INTO invoices (company_id, customer_id, issue_date, due_date, our_reference, your_reference, notes, created_by)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [req.company!.id, b.customerId, issueDate, dueDate, b.ourReference || '', b.yourReference || '', b.notes || '', req.session!.user.id]);
    await replaceInvoiceLines(c, inv!.id, lines);
    await audit(req, 'invoice.create', 'invoice', inv!.id, undefined, c);
    return inv!.id as number;
  });
  res.status(201).json({ data: await loadInvoice(pool, req.company!.id, id) });
}));

router.put('/invoices/:id', requireRole('member'), validate(invoiceSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof invoiceSchema>>(req);
  const lines = computeLines(b.lines);
  await transaction(async (c) => {
    const inv = await one(c, 'SELECT status, issue_date FROM invoices WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.company!.id]);
    if (!inv) throw notFound('Invoice not found');
    if (inv.status !== 'draft') throw conflict('Issued invoices cannot be changed; create a credit note instead');
    const terms = await customerTerms(c, req.company!.id, b.customerId);
    const issueDate = b.issueDate || inv.issue_date;
    const dueDate = b.dueDate || addDays(issueDate, terms);
    if (dueDate < issueDate) throw badRequest('The due date cannot be before the invoice date');
    await c.query(`UPDATE invoices SET customer_id = $1, issue_date = $2, due_date = $3, our_reference = $4, your_reference = $5, notes = $6
                   WHERE id = $7`, [b.customerId, issueDate, dueDate, b.ourReference || '', b.yourReference || '', b.notes || '', id]);
    await replaceInvoiceLines(c, id, lines);
  });
  res.json({ data: await loadInvoice(pool, req.company!.id, id) });
}));

router.delete('/invoices/:id', requireRole('member'), ah(async (req, res) => {
  const r = await pool.query(`DELETE FROM invoices WHERE id = $1 AND company_id = $2 AND status = 'draft'`, [idParam(req.params.id), req.company!.id]);
  if (!r.rowCount) throw conflict('Only drafts can be deleted');
  res.status(204).end();
}));

router.post('/invoices/:id/issue', requireRole('accountant'), ah(async (req, res) => {
  const id = idParam(req.params.id);
  await transaction(async (c) => {
    const r = await issueInvoice(c, req.company!.id, id, req.session!.user.id);
    await audit(req, 'invoice.issue', 'invoice', id, { number: r.number, voucher: `${r.voucher.series}${r.voucher.number}` }, c);
  });
  res.json({ data: await loadInvoice(pool, req.company!.id, id) });
}));

const paymentSchema = z.object({
  date: isoDate,
  amount: positiveOre,
  account: accountNumber.default(DEFAULT_BANK_ACCOUNT),
});

router.post('/invoices/:id/payments', requireRole('accountant'), validate(paymentSchema), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const b = valid<z.infer<typeof paymentSchema>>(req);
  await transaction(async (c) => {
    const r = await registerInvoicePayment(c, req.company!.id, id, b, req.session!.user.id);
    await audit(req, 'invoice.payment', 'invoice', id, { amount: b.amount, voucher: `${r.voucher.series}${r.voucher.number}` }, c);
  });
  res.status(201).json({ data: await loadInvoice(pool, req.company!.id, id) });
}));

router.post('/invoices/:id/credit', requireRole('accountant'), validate(z.object({ date: isoDate.optional() })), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const { date } = valid<{ date?: string }>(req);
  const r = await transaction(async (c) => {
    const out = await creditInvoice(c, req.company!.id, id, date || today(), req.session!.user.id);
    await audit(req, 'invoice.credit', 'invoice', id, { creditNote: out.number }, c);
    return out;
  });
  res.status(201).json({ data: await loadInvoice(pool, req.company!.id, r.creditNoteId) });
}));

export default router;
