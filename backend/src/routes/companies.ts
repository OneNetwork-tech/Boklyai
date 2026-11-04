import { Router } from 'express';
import { z } from 'zod';
import { one, pool, query, transaction } from '../db';
import { BAS_ACCOUNTS, DEFAULT_BANK_ACCOUNT } from '../data/bas';
import { companyAccess, requireAuth, requireRole } from '../middleware/auth';
import { isoDate, text, validate, valid, idParam } from '../middleware/validate';
import { audit } from '../services/audit';
import { sendMail } from '../services/mailer';
import { config } from '../config';
import { addDays, addMonths, today } from '../utils/dates';
import { normalizeOrgNumber, vatNumberFromOrg } from '../utils/swedish';
import { ah, badRequest, conflict, notFound, unprocessable } from '../utils/errors';

const router = Router();
router.use(requireAuth);

const ROLES = ['owner', 'accountant', 'member', 'viewer'] as const;

const orgNumber = z.string().transform((v, ctx) => {
  const n = normalizeOrgNumber(v);
  if (!n) {
    ctx.addIssue({ code: 'custom', message: 'Invalid organisationsnummer (check digit mismatch)' });
    return z.NEVER;
  }
  return n;
});

const companyFields = {
  name: z.string().trim().min(1).max(200),
  vatNumber: z.string().trim().max(20).regex(/^(SE\d{12})?$/, 'VAT number must look like SE556677889901').optional(),
  address: text(200).optional(),
  postalCode: text(20).optional(),
  city: text(100).optional(),
  email: z.union([z.literal(''), z.email().max(254)]).optional(),
  phone: text(50).optional(),
  bankgiro: z.string().trim().max(20).regex(/^(\d{3,4}-?\d{4})?$/, 'Bankgiro must look like 123-4567').optional(),
  plusgiro: text(20).optional(),
  iban: text(34).optional(),
  bic: text(11).optional(),
  vatPeriod: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
};

const createSchema = z.object({
  ...companyFields,
  orgNumber,
  fiscalYearStart: isoDate.optional(),
});

const updateSchema = z.object(companyFields).partial();

function companyJson(c: any) {
  return {
    id: c.id,
    name: c.name,
    orgNumber: c.org_number,
    vatNumber: c.vat_number,
    address: c.address,
    postalCode: c.postal_code,
    city: c.city,
    country: c.country,
    email: c.email,
    phone: c.phone,
    bankgiro: c.bankgiro,
    plusgiro: c.plusgiro,
    iban: c.iban,
    bic: c.bic,
    vatPeriod: c.vat_period,
    paymentTermsDays: c.payment_terms_days,
    lockedUntil: c.locked_until,
    role: c.role,
  };
}

router.get('/', ah(async (req, res) => {
  const rows = await query(pool, `SELECT c.*, m.role FROM companies c JOIN memberships m ON m.company_id = c.id
                                   WHERE m.user_id = $1 ORDER BY c.name`, [req.session!.user.id]);
  res.json({ data: rows.map(companyJson) });
}));

router.post('/', validate(createSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof createSchema>>(req);
  const fyStart = b.fiscalYearStart || `${today().slice(0, 4)}-01-01`;
  if (!fyStart.endsWith('-01')) throw badRequest('A fiscal year must start on the first day of a month');
  const company = await transaction(async (c) => {
    if (await one(c, 'SELECT 1 FROM companies WHERE org_number = $1', [b.orgNumber])) {
      throw conflict('A company with this organisationsnummer is already registered. Ask its owner to invite you.');
    }
    const row = await one(c, `
      INSERT INTO companies (name, org_number, vat_number, address, postal_code, city, email, phone, bankgiro, plusgiro, iban, bic, vat_period, payment_terms_days)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, 'quarterly'), COALESCE($14, 30)) RETURNING *`,
    [b.name, b.orgNumber, b.vatNumber || vatNumberFromOrg(b.orgNumber), b.address || '', b.postalCode || '', b.city || '',
      b.email || '', b.phone || '', b.bankgiro || '', b.plusgiro || '', b.iban || '', b.bic || '', b.vatPeriod ?? null, b.paymentTermsDays ?? null]);
    await c.query('INSERT INTO memberships (company_id, user_id, role) VALUES ($1, $2, $3)', [row!.id, req.session!.user.id, 'owner']);
    await c.query(`INSERT INTO accounts (company_id, number, name, vat_code)
                   SELECT $1, x.number, x.name, x.vat_code FROM jsonb_to_recordset($2::jsonb) AS x(number int, name text, vat_code text)`,
    [row!.id, JSON.stringify(BAS_ACCOUNTS.map((a) => ({ number: a.number, name: a.name, vat_code: a.vatCode ?? null })))]);
    await c.query('INSERT INTO fiscal_years (company_id, start_date, end_date) VALUES ($1, $2, $3)',
      [row!.id, fyStart, addDays(addMonths(fyStart, 12), -1)]);
    await c.query('INSERT INTO bank_accounts (company_id, name, ledger_account_number) VALUES ($1, $2, $3)',
      [row!.id, 'Företagskonto', DEFAULT_BANK_ACCOUNT]);
    return { ...row, role: 'owner' };
  });
  req.company = { id: company.id, role: 'owner', name: company.name, orgNumber: company.org_number, lockedUntil: null };
  await audit(req, 'company.create', 'company', company.id, { name: company.name });
  res.status(201).json({ data: companyJson(company) });
}));

const scoped = Router({ mergeParams: true });
router.use('/:companyId', companyAccess, scoped);

scoped.get('/', ah(async (req, res) => {
  const c = await one(pool, 'SELECT * FROM companies WHERE id = $1', [req.company!.id]);
  res.json({ data: companyJson({ ...c, role: req.company!.role }) });
}));

scoped.patch('/', requireRole('owner'), validate(updateSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof updateSchema>>(req);
  const map: Record<string, string> = {
    name: 'name', vatNumber: 'vat_number', address: 'address', postalCode: 'postal_code', city: 'city', email: 'email',
    phone: 'phone', bankgiro: 'bankgiro', plusgiro: 'plusgiro', iban: 'iban', bic: 'bic', vatPeriod: 'vat_period',
    paymentTermsDays: 'payment_terms_days',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    if ((b as any)[k] !== undefined) {
      values.push((b as any)[k]);
      sets.push(`${col} = $${values.length}`);
    }
  }
  if (!sets.length) throw badRequest('Nothing to update');
  values.push(req.company!.id);
  const c = await one(pool, `UPDATE companies SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  await audit(req, 'company.update', 'company', req.company!.id, b as Record<string, unknown>);
  res.json({ data: companyJson({ ...c, role: req.company!.role }) });
}));

/** Lock the books up to a date (no postings on or before it). */
scoped.put('/lock', requireRole('owner'), validate(z.object({ lockedUntil: isoDate.nullable() })), ah(async (req, res) => {
  const { lockedUntil } = valid<{ lockedUntil: string | null }>(req);
  if (lockedUntil && lockedUntil > today()) throw badRequest('You cannot lock a period in the future');
  const closed = await one(pool, 'SELECT max(end_date) AS end FROM fiscal_years WHERE company_id = $1 AND closed', [req.company!.id]);
  if (closed?.end && (!lockedUntil || lockedUntil < closed.end)) {
    throw unprocessable(`Closed fiscal years stay locked; the lock date cannot be earlier than ${closed.end}`);
  }
  await pool.query('UPDATE companies SET locked_until = $1 WHERE id = $2', [lockedUntil, req.company!.id]);
  await audit(req, 'company.lock', 'company', req.company!.id, { lockedUntil });
  res.json({ data: { lockedUntil } });
}));

// --- Members -------------------------------------------------------------------

scoped.get('/members', requireRole('viewer'), ah(async (req, res) => {
  const members = await query(pool, `SELECT u.id, u.email, u.first_name, u.last_name, m.role, m.created_at
                                     FROM memberships m JOIN users u ON u.id = m.user_id
                                     WHERE m.company_id = $1 ORDER BY u.email`, [req.company!.id]);
  const invitations = req.company!.role === 'owner'
    ? await query(pool, 'SELECT id, email, role, created_at FROM invitations WHERE company_id = $1 AND accepted_at IS NULL ORDER BY created_at', [req.company!.id])
    : [];
  res.json({
    data: members.map((m) => ({ userId: m.id, email: m.email, name: `${m.first_name} ${m.last_name}`.trim(), role: m.role, since: m.created_at })),
    invitations: invitations.map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.created_at })),
  });
}));

const inviteSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), role: z.enum(ROLES) });

scoped.post('/members', requireRole('owner'), validate(inviteSchema), ah(async (req, res) => {
  const b = valid<z.infer<typeof inviteSchema>>(req);
  const user = await one(pool, 'SELECT id FROM users WHERE lower(email) = $1', [b.email]);
  if (user) {
    const r = await pool.query('INSERT INTO memberships (company_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [req.company!.id, user.id, b.role]);
    if (!r.rowCount) throw conflict('This user is already a member');
    await audit(req, 'member.add', 'user', user.id, { role: b.role });
    await sendMail({ to: b.email, subject: `Du har fått tillgång till ${req.company!.name} i BoklyAI`, text: `Logga in på ${config.publicUrl} för att komma åt ${req.company!.name}.` });
    return res.status(201).json({ data: { added: true } });
  }
  try {
    await pool.query('INSERT INTO invitations (company_id, email, role, invited_by) VALUES ($1, $2, $3, $4)', [req.company!.id, b.email, b.role, req.session!.user.id]);
  } catch (err: any) {
    if (err.code === '23505') throw conflict('An invitation is already pending for this email');
    throw err;
  }
  await audit(req, 'member.invite', 'invitation', null, { email: b.email, role: b.role });
  await sendMail({
    to: b.email,
    subject: `Inbjudan till ${req.company!.name} i BoklyAI`,
    text: `Du har bjudits in till ${req.company!.name}. Skapa ett konto med denna e-postadress på ${config.publicUrl}/register så får du tillgång automatiskt.`,
  });
  return res.status(201).json({ data: { invited: true } });
}));

scoped.delete('/invitations/:invitationId', requireRole('owner'), ah(async (req, res) => {
  const r = await pool.query('DELETE FROM invitations WHERE id = $1 AND company_id = $2 AND accepted_at IS NULL', [idParam(req.params.invitationId), req.company!.id]);
  if (!r.rowCount) throw notFound('Invitation not found');
  res.status(204).end();
}));

async function assertOwnerRemains(companyId: number, userId: number) {
  const owners = await one(pool, `SELECT count(*) AS n FROM memberships WHERE company_id = $1 AND role = 'owner' AND user_id <> $2`, [companyId, userId]);
  if (!owners || owners.n === 0) throw unprocessable('A company must have at least one owner');
}

scoped.patch('/members/:userId', requireRole('owner'), validate(z.object({ role: z.enum(ROLES) })), ah(async (req, res) => {
  const userId = idParam(req.params.userId);
  const { role } = valid<{ role: string }>(req);
  const m = await one(pool, 'SELECT role FROM memberships WHERE company_id = $1 AND user_id = $2', [req.company!.id, userId]);
  if (!m) throw notFound('Member not found');
  if (m.role === 'owner' && role !== 'owner') await assertOwnerRemains(req.company!.id, userId);
  await pool.query('UPDATE memberships SET role = $1 WHERE company_id = $2 AND user_id = $3', [role, req.company!.id, userId]);
  await audit(req, 'member.role', 'user', userId, { from: m.role, to: role });
  res.json({ data: { userId, role } });
}));

scoped.delete('/members/:userId', requireRole('owner'), ah(async (req, res) => {
  const userId = idParam(req.params.userId);
  const m = await one(pool, 'SELECT role FROM memberships WHERE company_id = $1 AND user_id = $2', [req.company!.id, userId]);
  if (!m) throw notFound('Member not found');
  if (m.role === 'owner') await assertOwnerRemains(req.company!.id, userId);
  await pool.query('DELETE FROM memberships WHERE company_id = $1 AND user_id = $2', [req.company!.id, userId]);
  await audit(req, 'member.remove', 'user', userId);
  res.status(204).end();
}));

scoped.get('/audit-log', requireRole('accountant'), ah(async (req, res) => {
  const limit = Math.min(Number.parseInt(String(req.query.limit), 10) || 100, 500);
  const offset = Math.max(Number.parseInt(String(req.query.offset), 10) || 0, 0);
  const rows = await query(pool, `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.ip, a.created_at, u.email
                                  FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
                                  WHERE a.company_id = $1 ORDER BY a.id DESC LIMIT $2 OFFSET $3`, [req.company!.id, limit, offset]);
  res.json({
    data: rows.map((r) => ({
      id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id, details: r.details, ip: r.ip, user: r.email, createdAt: r.created_at,
    })),
  });
}));

export default router;
export { scoped as companyRouter };
