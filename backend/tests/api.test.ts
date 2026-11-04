import type { Express } from 'express';
import request from 'supertest';
import { pool } from '../src/db';
import { outbox } from '../src/services/mailer';
import * as bankid from '../src/services/bankid';
import { isValidOcr } from '../src/utils/swedish';
import {
  Client, ORG, kr, resetDatabase,
} from './helpers';

// All bookkeeping happens in the previous calendar year so every period has
// ended (VAT settlement and year-end close need that) regardless of run date.
const Y = new Date().getFullYear() - 1;
const D = (md: string) => `${Y}-${md}`;

let app: Express;
let owner: Client;
let cid: number;
const base = () => `/api/companies/${cid}`;

beforeAll(async () => {
  app = await resetDatabase();
  owner = new Client(app);
});

afterAll(async () => {
  bankid.setTransport(null);
  await pool.end();
});

describe('authentication & sessions', () => {
  test('register creates a session and returns a CSRF token', async () => {
    const body = await owner.register('owner@example.se', 'a-long-secure-password', 'Olle', 'Ägare');
    expect(body.user.email).toBe('owner@example.se');
    expect(body.csrfToken).toBeTruthy();
    expect((await owner.get('/api/auth/me')).status).toBe(200);
  });

  test('session cookie is httpOnly, SameSite=Strict', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'owner@example.se', password: 'a-long-secure-password' });
    const cookies = res.headers['set-cookie'] as unknown as string[];
    const session = cookies.find((c) => c.startsWith('bokly_session='))!;
    expect(session).toMatch(/HttpOnly/);
    expect(session).toMatch(/SameSite=Strict/);
  });

  test('weak passwords and duplicate emails are rejected', async () => {
    const c = new Client(app);
    expect((await c.agent.post('/api/auth/register').send({ email: 'x@example.se', password: 'short', firstName: 'a', lastName: 'b' })).status).toBe(400);
    expect((await c.agent.post('/api/auth/register').send({ email: 'OWNER@example.se', password: 'a-long-secure-password', firstName: 'a', lastName: 'b' })).status).toBe(409);
  });

  test('state-changing requests require the CSRF token', async () => {
    const res = await owner.agent.post('/api/companies').send({ name: 'X', orgNumber: ORG.a });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/CSRF/);
  });

  test('cross-origin requests are rejected', async () => {
    const res = await owner.agent.post('/api/auth/logout').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });

  test('accounts lock after repeated failed logins', async () => {
    const c = new Client(app);
    await c.register('locked@example.se');
    for (let i = 0; i < 5; i += 1) expect((await c.login('locked@example.se', 'wrong-password-123')).status).toBe(401);
    const res = await c.login('locked@example.se');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/locked/);
  });

  test('password reset never returns the token and is single-use', async () => {
    const c = new Client(app);
    await c.register('reset@example.se');
    const before = outbox.length;
    const res = await request(app).post('/api/auth/password/forgot').send({ email: 'reset@example.se' });
    expect(res.status).toBe(202);
    expect(JSON.stringify(res.body)).not.toMatch(/token/i);
    // Unknown emails get the same response.
    expect((await request(app).post('/api/auth/password/forgot').send({ email: 'nobody@example.se' })).body).toEqual(res.body);
    expect(outbox.length).toBe(before + 1);
    const token = decodeURIComponent(outbox[outbox.length - 1].text.match(/token=([^\s]+)/)![1]);
    const ok = await request(app).post('/api/auth/password/reset').send({ token, newPassword: 'brand-new-password-1' });
    expect(ok.status).toBe(204);
    // Old session is gone, token cannot be reused, new password works.
    expect((await c.get('/api/auth/me')).status).toBe(401);
    expect((await request(app).post('/api/auth/password/reset').send({ token, newPassword: 'another-new-password' })).status).toBe(400);
    expect((await c.login('reset@example.se', 'brand-new-password-1')).status).toBe(200);
  });

  test('logout destroys the session', async () => {
    const c = new Client(app);
    await c.register('logout@example.se');
    expect((await c.get('/api/auth/session')).body.user.email).toBe('logout@example.se');
    expect((await c.post('/api/auth/logout')).status).toBe(204);
    expect((await c.get('/api/auth/me')).status).toBe(401);
    // The SPA's session probe answers 200 with no user instead of a 401.
    const probe = await c.get('/api/auth/session');
    expect(probe.status).toBe(200);
    expect(probe.body).toEqual({ user: null, companies: [] });
  });
});

describe('companies & tenancy', () => {
  test('organisationsnummer is validated', async () => {
    const res = await owner.post('/api/companies', { name: 'Bad AB', orgNumber: '556677-8898' });
    expect(res.status).toBe(400);
  });

  test('creating a company seeds BAS, a fiscal year and a bank account', async () => {
    const res = await owner.post('/api/companies', {
      name: 'Testbolaget AB', orgNumber: '5566778899', fiscalYearStart: D('01-01'), bankgiro: '123-4567', vatPeriod: 'quarterly',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ orgNumber: ORG.a, vatNumber: 'SE556677889901', role: 'owner' });
    cid = res.body.data.id;
    const accounts = await owner.get(`${base()}/accounts`);
    expect(accounts.body.data.length).toBeGreaterThan(90);
    expect(accounts.body.data.find((a: any) => a.number === 2611).vatCode).toBe('U25');
    const fys = await owner.get(`${base()}/fiscal-years`);
    expect(fys.body.data).toEqual([expect.objectContaining({ startDate: D('01-01'), endDate: D('12-31'), closed: false })]);
    const banks = await owner.get(`${base()}/bank-accounts`);
    expect(banks.body.data[0]).toMatchObject({ ledgerAccount: 1930, ledgerBalance: 0 });
  });

  test('the same company cannot be registered twice', async () => {
    expect((await owner.post('/api/companies', { name: 'Dup', orgNumber: ORG.a })).status).toBe(409);
  });

  test('outsiders get 404 for another company', async () => {
    const outsider = new Client(app);
    await outsider.register('outsider@example.se');
    expect((await outsider.get(`${base()}/accounts`)).status).toBe(404);
    expect((await outsider.get(`${base()}/invoices`)).status).toBe(404);
    expect((await outsider.post(`${base()}/vouchers`, { date: D('01-02'), description: 'x', lines: [] })).status).toBe(404);
  });

  test('roles restrict what members can do', async () => {
    await owner.post(`${base()}/members`, { email: 'viewer@example.se', role: 'viewer' }); // pending invite
    const viewer = new Client(app);
    await viewer.register('viewer@example.se'); // invitation auto-accepted
    expect((await viewer.get(`${base()}/accounts`)).status).toBe(200);
    expect((await viewer.post(`${base()}/vouchers`, { date: D('01-02'), description: 'x', lines: [{ account: 1930, debit: 1 }, { account: 2081, credit: 1 }] })).status).toBe(403);
    expect((await viewer.get(`${base()}/employees`)).status).toBe(403);
    expect((await viewer.patch(base(), { name: 'Hacked' })).status).toBe(403);
    const members = await owner.get(`${base()}/members`);
    expect(members.body.data.map((m: any) => m.role).sort()).toEqual(['owner', 'viewer']);
  });

  test('the last owner cannot be removed or demoted', async () => {
    const me = await owner.get('/api/auth/me');
    expect((await owner.patch(`${base()}/members/${me.body.user.id}`, { role: 'viewer' })).status).toBe(422);
    expect((await owner.delete(`${base()}/members/${me.body.user.id}`)).status).toBe(422);
  });
});

describe('ledger', () => {
  test('share capital voucher posts with gapless numbering', async () => {
    const res = await owner.post(`${base()}/vouchers`, {
      date: D('01-02'), description: 'Insättning aktiekapital',
      lines: [{ account: 1930, debit: kr(25000) }, { account: 2081, credit: kr(25000) }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ref: 'A1', total: kr(25000) });
  });

  test('unbalanced, one-line and unknown-account vouchers are rejected', async () => {
    const post = (lines: any[]) => owner.post(`${base()}/vouchers`, { date: D('01-03'), description: 'x', lines });
    expect((await post([{ account: 1930, debit: 100 }, { account: 2081, credit: 99 }])).body.error).toMatch(/does not balance/);
    expect((await post([{ account: 1930, debit: 100 }, { account: 2081, credit: 0 }])).status).toBe(400);
    expect((await post([{ account: 1930, debit: 100 }, { account: 1234, credit: 100 }])).body.error).toMatch(/Unknown account/);
    expect((await post([{ account: 1930, debit: 100, credit: 100 }, { account: 2081, credit: 0 }])).status).toBe(400);
  });

  test('dates outside a fiscal year are rejected', async () => {
    const res = await owner.post(`${base()}/vouchers`, { date: `${Y - 3}-06-01`, description: 'x', lines: [{ account: 1930, debit: 1 }, { account: 2081, credit: 1 }] });
    expect(res.status).toBe(422);
  });

  test('reversal creates a correcting voucher; vouchers stay immutable', async () => {
    const created = await owner.post(`${base()}/vouchers`, {
      date: D('01-05'), description: 'Felbokning', lines: [{ account: 6110, debit: kr(100) }, { account: 1930, credit: kr(100) }],
    });
    expect(created.body.data.ref).toBe('A2');
    const rev = await owner.post(`${base()}/vouchers/${created.body.data.id}/reverse`, { date: D('01-06'), reason: 'fel konto' });
    expect(rev.status).toBe(201);
    expect(rev.body.data.ref).toBe('A3');
    expect(rev.body.data.lines).toEqual([
      expect.objectContaining({ account: 6110, debit: 0, credit: kr(100) }),
      expect.objectContaining({ account: 1930, debit: kr(100), credit: 0 }),
    ]);
    expect((await owner.post(`${base()}/vouchers/${created.body.data.id}/reverse`, {})).status).toBe(409);
    expect((await owner.post(`${base()}/vouchers/${rev.body.data.id}/reverse`, {})).status).toBe(409);
    const orig = await owner.get(`${base()}/vouchers/${created.body.data.id}`);
    expect(orig.body.data.reversedByRef).toBe('A3');
    // The database refuses edits even if application code were bypassed.
    await expect(pool.query('UPDATE voucher_lines SET debit = 1 WHERE voucher_id = $1', [created.body.data.id])).rejects.toThrow(/immutable/);
    await expect(pool.query('DELETE FROM vouchers WHERE id = $1', [created.body.data.id])).rejects.toThrow(/cannot be deleted/);
  });

  test('the database rejects unbalanced vouchers at commit', async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const fy = (await c.query('SELECT id FROM fiscal_years WHERE company_id = $1', [cid])).rows[0];
      const v = (await c.query(`INSERT INTO vouchers (company_id, fiscal_year_id, series, number, date, description)
                                VALUES ($1, $2, 'Z', 1, $3, 'raw') RETURNING id`, [cid, fy.id, D('01-10')])).rows[0];
      const acc = (await c.query('SELECT id FROM accounts WHERE company_id = $1 AND number IN (1930, 2081) ORDER BY number', [cid])).rows;
      await c.query('INSERT INTO voucher_lines (voucher_id, company_id, line_no, account_id, debit) VALUES ($1, $2, 1, $3, 100)', [v.id, cid, acc[0].id]);
      await c.query('INSERT INTO voucher_lines (voucher_id, company_id, line_no, account_id, credit) VALUES ($1, $2, 2, $3, 90)', [v.id, cid, acc[1].id]);
      await expect(c.query('COMMIT')).rejects.toThrow(/does not balance/);
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  });
});

describe('sales', () => {
  let customerId: number;
  let invoiceId: number;
  let ocr: string;

  test('customer and draft invoice with mixed VAT rates', async () => {
    const cu = await owner.post(`${base()}/customers`, { name: 'Kund AB', orgNumber: ORG.b, email: 'kund@example.se' });
    expect(cu.status).toBe(201);
    customerId = cu.body.data.id;
    const inv = await owner.post(`${base()}/invoices`, {
      customerId,
      issueDate: D('02-10'),
      lines: [
        { description: 'Konsulttimmar', quantity: 2, unitPrice: kr(1000), vatRate: 25 },
        { description: 'Bok', quantity: 1, unitPrice: kr(500), vatRate: 12 },
      ],
    });
    expect(inv.status).toBe(201);
    invoiceId = inv.body.data.id;
    expect(inv.body.data).toMatchObject({ status: 'draft', number: null, net: kr(2500), vat: kr(560), total: kr(3060), dueDate: D('03-12') });
  });

  test('drafts can be edited; viewers cannot issue', async () => {
    const res = await owner.put(`${base()}/invoices/${invoiceId}`, {
      customerId,
      issueDate: D('02-10'),
      lines: [
        { description: 'Konsulttimmar', quantity: 2, unitPrice: kr(1000), vatRate: 25 },
        { description: 'Bok', quantity: 1, unitPrice: kr(500), vatRate: 12 },
      ],
    });
    expect(res.status).toBe(200);
  });

  test('issuing allocates number + OCR and posts to the ledger', async () => {
    const res = await owner.post(`${base()}/invoices/${invoiceId}/issue`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'issued', number: 1001, voucherRef: 'F1' });
    ocr = res.body.data.ocr;
    expect(isValidOcr(ocr)).toBe(true);
    const v = await owner.get(`${base()}/vouchers/${res.body.data.voucherId}`);
    const byAcc = Object.fromEntries(v.body.data.lines.map((l: any) => [l.account, l.debit - l.credit]));
    expect(byAcc).toEqual({ 1510: kr(3060), 3001: -kr(2000), 3002: -kr(500), 2611: -kr(500), 2621: -kr(60) });
    expect((await owner.put(`${base()}/invoices/${invoiceId}`, { customerId, lines: [] })).status).toBe(409);
    expect((await owner.delete(`${base()}/invoices/${invoiceId}`)).status).toBe(409);
  });

  test('partial payment keeps it open; overpayment is refused', async () => {
    const p = await owner.post(`${base()}/invoices/${invoiceId}/payments`, { date: D('02-20'), amount: kr(1000) });
    expect(p.status).toBe(201);
    expect(p.body.data).toMatchObject({ status: 'issued', paid: kr(1000), remaining: kr(2060) });
    expect((await owner.post(`${base()}/invoices/${invoiceId}/payments`, { date: D('02-21'), amount: kr(5000) })).status).toBe(422);
  });

  test('crediting an unpaid invoice creates a credit note that reverses it', async () => {
    const inv = await owner.post(`${base()}/invoices`, {
      customerId, issueDate: D('02-15'), lines: [{ description: 'Fel', quantity: 1, unitPrice: kr(800), vatRate: 25 }],
    });
    await owner.post(`${base()}/invoices/${inv.body.data.id}/issue`);
    const credit = await owner.post(`${base()}/invoices/${inv.body.data.id}/credit`, { date: D('02-16') });
    expect(credit.status).toBe(201);
    expect(credit.body.data).toMatchObject({ kind: 'credit_note', number: 1003, total: -kr(1000), status: 'credited', creditsNumber: 1002 });
    const orig = await owner.get(`${base()}/invoices/${inv.body.data.id}`);
    expect(orig.body.data).toMatchObject({ status: 'credited', remaining: 0 });
  });

  test('the remaining amount is settled from the bank import later', () => expect(ocr).toBeTruthy());

  // Expose for later tests.
  afterAll(() => { (global as any).OCR = ocr; (global as any).INVOICE_ID = invoiceId; });
});

describe('purchases', () => {
  let supplierId: number;
  let billId: number;

  test('supplier invoice is booked with input VAT and payables', async () => {
    const s = await owner.post(`${base()}/suppliers`, { name: 'Molnleverantören AB', bankgiro: '555-1234', defaultAccount: 6540 });
    supplierId = s.body.data.id;
    const b = await owner.post(`${base()}/bills`, {
      supplierId, supplierInvoiceNumber: 'INV-77', invoiceDate: D('02-05'), dueDate: D('03-05'), paymentReference: '7788',
      lines: [{ description: 'Molntjänst feb', account: 6540, net: kr(1000), vatRate: 25 }],
    });
    expect(b.status).toBe(201);
    billId = b.body.data.id;
    expect(b.body.data).toMatchObject({ total: kr(1250), vat: kr(250), status: 'draft' });
    const booked = await owner.post(`${base()}/bills/${billId}/book`);
    expect(booked.body.data).toMatchObject({ status: 'booked', voucherRef: 'L1' });
    const v = await owner.get(`${base()}/vouchers/${booked.body.data.voucherId}`);
    const byAcc = Object.fromEntries(v.body.data.lines.map((l: any) => [l.account, l.debit - l.credit]));
    expect(byAcc).toEqual({ 6540: kr(1000), 2641: kr(250), 2440: -kr(1250) });
  });

  test('purchases cannot be booked on revenue or VAT accounts', async () => {
    const b = await owner.post(`${base()}/bills`, {
      supplierId, invoiceDate: D('02-05'), lines: [{ account: 3001, net: 100, vatRate: 0 }],
    });
    expect(b.status).toBe(400);
  });

  afterAll(() => { (global as any).BILL_ID = billId; });
});

describe('bank import & AI categorisation', () => {
  let bankAccountId: number;
  let txs: any[];

  test('imports a Swedish CSV and is idempotent', async () => {
    const banks = await owner.get(`${base()}/bank-accounts`);
    bankAccountId = banks.body.data[0].id;
    const ocr = (global as any).OCR;
    const csv = [
      'Bokföringsdag;Text;Belopp;Saldo',
      `${D('02-25')};Inbetalning OCR ${ocr};2 060,00;27 060,00`,
      `${D('03-04')};BG 555-1234 Molnleverantören 7788;-1 250,00;25 810,00`,
      `${D('03-06')};Kortköp CIRCLE K STOCKHOLM;-625,00;25 185,00`,
      `${D('03-07')};Månadsavgift företagskonto;-95,00;25 090,00`,
    ].join('\n');
    const res = await owner.upload(`${base()}/bank-accounts/${bankAccountId}/import`, 'file', Buffer.from(csv), 'konto.csv');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ imported: 4, duplicates: 0 });
    const again = await owner.upload(`${base()}/bank-accounts/${bankAccountId}/import`, 'file', Buffer.from(csv), 'konto.csv');
    expect(again.body.data).toMatchObject({ imported: 0, duplicates: 4 });
  });

  test('suggests the matching invoice, bill and accounts', async () => {
    const res = await owner.get(`${base()}/bank-transactions?status=unmatched`);
    txs = res.body.data.sort((a: any, b: any) => a.date.localeCompare(b.date));
    expect(txs[0].suggestions[0]).toMatchObject({ type: 'invoice', id: (global as any).INVOICE_ID });
    expect(txs[0].suggestions[0].confidence).toBeGreaterThan(0.9);
    expect(txs[1].suggestions[0]).toMatchObject({ type: 'bill', id: (global as any).BILL_ID });
    expect(txs[2].suggestions[0]).toMatchObject({ type: 'account', account: 5611, vatRate: 25 });
    expect(txs[3].suggestions[0]).toMatchObject({ type: 'account', account: 6570 });
  });

  test('matching settles the invoice and the bill', async () => {
    expect((await owner.post(`${base()}/bank-transactions/${txs[0].id}/match`, { type: 'invoice', id: (global as any).INVOICE_ID })).status).toBe(200);
    expect((await owner.post(`${base()}/bank-transactions/${txs[1].id}/match`, { type: 'bill', id: (global as any).BILL_ID })).status).toBe(200);
    expect((await owner.get(`${base()}/invoices/${(global as any).INVOICE_ID}`)).body.data).toMatchObject({ status: 'paid', remaining: 0 });
    expect((await owner.get(`${base()}/bills/${(global as any).BILL_ID}`)).body.data).toMatchObject({ status: 'paid', remaining: 0 });
    expect((await owner.post(`${base()}/bank-transactions/${txs[0].id}/match`, { type: 'invoice', id: (global as any).INVOICE_ID })).status).toBe(409);
  });

  test('booking to an account splits VAT and learns the pattern', async () => {
    const res = await owner.post(`${base()}/bank-transactions/${txs[2].id}/book`, { account: 5611, vatRate: 25 });
    expect(res.status).toBe(200);
    const v = await owner.get(`${base()}/vouchers/${res.body.data.voucherId}`);
    const byAcc = Object.fromEntries(v.body.data.lines.map((l: any) => [l.account, l.debit - l.credit]));
    expect(byAcc).toEqual({ 5611: kr(500), 2641: kr(125), 1930: -kr(625) });
    await owner.post(`${base()}/bank-transactions/${txs[3].id}/book`, { account: 6570, vatRate: 0 });
    // A new similar transaction now gets the learned suggestion.
    await owner.post(`${base()}/bank-accounts/${bankAccountId}/transactions`, { date: D('03-20'), description: 'Kortköp CIRCLE K GÖTEBORG', amount: -kr(400) });
    const list = await owner.get(`${base()}/bank-transactions?status=unmatched`);
    const s = list.body.data[0].suggestions[0];
    expect(s).toMatchObject({ account: 5611, vatRate: 25 });
    expect(s.reason).toMatch(/Learned/);
    await owner.post(`${base()}/bank-transactions/${list.body.data[0].id}/book`, { account: 5611, vatRate: 25 });
  });

  test('reversing a bank voucher returns the transaction to the inbox', async () => {
    const booked = await owner.get(`${base()}/bank-transactions?status=booked`);
    const fee = booked.body.data.find((t: any) => t.matchedType === 'account' && t.amount === -kr(95));
    expect((await owner.post(`${base()}/vouchers/${fee.voucherId}/reverse`, { date: D('03-07') })).status).toBe(201);
    const unmatched = await owner.get(`${base()}/bank-transactions?status=unmatched`);
    expect(unmatched.body.data.map((t: any) => t.id)).toContain(fee.id);
    await owner.post(`${base()}/bank-transactions/${fee.id}/book`, { account: 6570, vatRate: 0 });
  });

  test('invoice vouchers cannot be reversed directly', async () => {
    const inv = await owner.get(`${base()}/invoices/${(global as any).INVOICE_ID}`);
    const res = await owner.post(`${base()}/vouchers/${inv.body.data.voucherId}/reverse`, {});
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/credit note/);
  });
});

describe('documents', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

  test('accepts images/PDF by content, rejects others', async () => {
    const bad = await owner.upload(`${base()}/documents`, 'file', Buffer.from('<html><script>alert(1)</script>'), 'kvitto.pdf');
    expect(bad.status).toBe(400);
    const ok = await owner.upload(`${base()}/documents`, 'file', png, 'kvitto.png');
    expect(ok.status).toBe(201);
    expect(ok.body.data.mimeType).toBe('image/png');
    const file = await owner.get(`${base()}/documents/${ok.body.data.id}/file`);
    expect(file.status).toBe(200);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    const outsider = new Client(app);
    await outsider.register('doc-outsider@example.se');
    expect((await outsider.get(`${base()}/documents/${ok.body.data.id}/file`)).status).toBe(404);
  });

  test('documents attached to vouchers cannot be deleted', async () => {
    const doc = await owner.upload(`${base()}/documents`, 'file', png, 'kvitto2.png');
    const v = await owner.post(`${base()}/vouchers`, {
      date: D('03-10'), description: 'Kontorsmaterial kontant', documentIds: [doc.body.data.id],
      lines: [{ account: 6110, debit: kr(80) }, { account: 2641, debit: kr(20) }, { account: 1930, credit: kr(100) }],
    });
    expect(v.status).toBe(201);
    expect(v.body.data.documents).toHaveLength(1);
    expect((await owner.delete(`${base()}/documents/${doc.body.data.id}`)).status).toBe(409);
    const loose = await owner.upload(`${base()}/documents`, 'file', png, 'tmp.png');
    expect((await owner.delete(`${base()}/documents/${loose.body.data.id}`)).status).toBe(204);
  });
});

describe('VAT, reports and SIE', () => {
  const Q1 = { from: D('01-01'), to: D('03-31') };

  test('momsdeklaration boxes are computed from the ledger', async () => {
    const res = await owner.get(`${base()}/vat/report?from=${Q1.from}&to=${Q1.to}`);
    expect(res.status).toBe(200);
    // Sales: 2 000 (25 %) + 500 (12 %); output VAT 500 + 60.
    // Input VAT: 250 (bill) + 125 + 100 (fuel) + 20 (cash receipt).
    expect(res.body.data.ore).toMatchObject({
      box05: kr(2500), box10: kr(500), box11: kr(60), box12: 0, box48: kr(250 + 125 + 80 + 20), box49: kr(560 - 475),
    });
    expect(res.body.data.kronor.box49).toBe(85);
  });

  test('settling VAT books against 2650 and cannot be repeated', async () => {
    const res = await owner.post(`${base()}/vat/settle`, Q1);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ voucherRef: 'M1', toPay: kr(85) });
    expect((await owner.post(`${base()}/vat/settle`, Q1)).status).toBe(409);
    const after = await owner.get(`${base()}/vat/report?from=${Q1.from}&to=${Q1.to}`);
    expect(after.body.data.ore.box49).toBe(kr(85)); // settlement voucher is excluded
    expect(after.body.data.settled.voucherRef).toBe('M1');
    const periods = await owner.get(`${base()}/vat/periods`);
    expect(periods.body.data.find((p: any) => p.from === Q1.from)).toMatchObject({ to: Q1.to, settled: true });
  });

  test('trial balance balances and the balance sheet adds up', async () => {
    const tb = await owner.get(`${base()}/reports/trial-balance?from=${D('01-01')}&to=${D('12-31')}`);
    expect(tb.body.data.totals.debit).toBe(tb.body.data.totals.credit);
    expect(tb.body.data.totals.closing).toBe(0);
    const bs = await owner.get(`${base()}/reports/balance-sheet?date=${D('12-31')}`);
    expect(bs.body.data.balanced).toBe(true);
    expect(bs.body.data.totalAssets).toBeGreaterThan(0);
  });

  test('income statement result matches revenue minus costs', async () => {
    const is = await owner.get(`${base()}/reports/income-statement?from=${D('01-01')}&to=${D('12-31')}`);
    const netSales = is.body.data.sections.find((s: any) => s.key === 'netSales').total;
    expect(netSales).toBe(kr(2500));
    // Costs: 1 000 cloud + 500 + 320 fuel + 95 fee + 80 office (the reversed 100 nets to zero).
    expect(is.body.data.netResult).toBe(kr(2500) - kr(1000 + 500 + 320 + 95 + 80));
    const dash = await owner.get(`${base()}/dashboard`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.monthly).toHaveLength(12);
  });

  test('general ledger shows running balance', async () => {
    const gl = await owner.get(`${base()}/reports/general-ledger?account=1930&from=${D('01-01')}&to=${D('12-31')}`);
    expect(gl.body.data.opening).toBe(0);
    const last = gl.body.data.lines[gl.body.data.lines.length - 1];
    expect(last.balance).toBe(gl.body.data.closing);
    expect(gl.body.data.lines[0]).toMatchObject({ ref: 'A1', debit: kr(25000), balance: kr(25000) });
  });

  test('SIE4 export in PC8 encoding', async () => {
    const fys = await owner.get(`${base()}/fiscal-years`);
    const res = await owner.get(`${base()}/sie/${fys.body.data[0].id}`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    const body = res.body as Buffer;
    const text = body.toString('latin1');
    expect(text).toContain('#SIETYP 4');
    expect(text).toContain(`#ORGNR ${ORG.a}`);
    // 'ä' is byte 0x84 in CP437, which latin1-decodes to '\x84'.
    expect(text).toMatch(/#VER "A" "1" \d{8} "Ins\x84ttning aktiekapital"/);
    expect(text).toContain('#TRANS 1930 {} 25000.00');
    expect(body.includes(Buffer.from([0x84]))).toBe(true); // 'ä' in CP437
    expect(body.includes(Buffer.from('ä', 'utf8'))).toBe(false);
  });
});

describe('payroll', () => {
  let runId: number;

  test('personnummer is validated', async () => {
    const res = await owner.post(`${base()}/employees`, {
      firstName: 'Fel', lastName: 'Nummer', personalNumber: '850115-1231', employmentStart: D('01-01'), monthlySalary: kr(30000), taxRate: 30,
    });
    expect(res.status).toBe(400);
  });

  test('payroll run calculates tax and employer contributions by age', async () => {
    await owner.post(`${base()}/employees`, {
      firstName: 'Anna', lastName: 'Andersson', personalNumber: '8501151230', employmentStart: D('01-01'), monthlySalary: kr(35000), taxRate: 31.5,
    });
    await owner.post(`${base()}/employees`, {
      firstName: 'Sven', lastName: 'Senior', personalNumber: '19581224-1239', employmentStart: D('01-01'), monthlySalary: kr(20000), taxRate: 25,
    });
    const res = await owner.post(`${base()}/payroll-runs`, { period: `${Y}-04`, payDate: D('04-25') });
    expect(res.status).toBe(201);
    runId = res.body.data.id;
    const anna = res.body.data.payslips.find((p: any) => p.name.startsWith('Anna'));
    const sven = res.body.data.payslips.find((p: any) => p.name.startsWith('Sven'));
    expect(anna).toMatchObject({ gross: kr(35000), tax: kr(11025), net: kr(23975), employerFeeRate: 31.42, employerFee: kr(10997) });
    // Born 1958: turned 66 before the start of the year if Y >= 2025.
    if (Y >= 2025) expect(sven.employerFeeRate).toBe(10.21);
  });

  test('payslip adjustments and booking', async () => {
    const run = await owner.get(`${base()}/payroll-runs/${runId}`);
    const anna = run.body.data.payslips.find((p: any) => p.name.startsWith('Anna'));
    const adj = await owner.patch(`${base()}/payroll-runs/${runId}/payslips/${anna.id}`, { additions: kr(2000) });
    expect(adj.body.data.payslips.find((p: any) => p.id === anna.id)).toMatchObject({ gross: kr(37000), tax: kr(11655) });
    const booked = await owner.post(`${base()}/payroll-runs/${runId}/book`, {});
    expect(booked.status).toBe(200);
    expect(booked.body.data.voucherRef).toBe('P1');
    const t = booked.body.data.totals;
    const v = await owner.get(`${base()}/vouchers/${booked.body.data.voucherId}`);
    const byAcc = Object.fromEntries(v.body.data.lines.map((l: any) => [l.account, l.debit - l.credit]));
    expect(byAcc).toEqual({ 7210: t.gross, 7510: t.employerFee, 2710: -t.tax, 2731: -t.employerFee, 1930: -t.net });
    expect((await owner.patch(`${base()}/payroll-runs/${runId}/payslips/${anna.id}`, { additions: 0 })).status).toBe(409);
    const agi = await owner.get(`${base()}/payroll-runs/${runId}/agi`);
    expect(agi.body.data.individuals).toHaveLength(2);
    expect(agi.body.data.employer.totalToPay).toBe(Math.trunc(t.tax / 100) + Math.trunc(t.employerFee / 100));
    expect((await owner.post(`${base()}/payroll-runs`, { period: `${Y}-04`, payDate: D('04-25') })).status).toBe(409);
  });
});

describe('period lock and year-end', () => {
  test('locked periods reject postings', async () => {
    expect((await owner.put(`${base()}/lock`, { lockedUntil: D('03-31') })).status).toBe(200);
    const res = await owner.post(`${base()}/vouchers`, { date: D('03-15'), description: 'sent', lines: [{ account: 6110, debit: 100 }, { account: 1930, credit: 100 }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/locked/);
  });

  test('closing the year books the result, locks it and opens the next', async () => {
    const before = await owner.get(`${base()}/reports/income-statement?from=${D('01-01')}&to=${D('12-31')}`);
    const fys = await owner.get(`${base()}/fiscal-years`);
    const res = await owner.post(`${base()}/fiscal-years/${fys.body.data[0].id}/close`);
    expect(res.status).toBe(200);
    expect(res.body.data.result).toBe(before.body.data.netResult);
    const after = await owner.get(`${base()}/fiscal-years`);
    expect(after.body.data).toHaveLength(2);
    expect(after.body.data[0]).toMatchObject({ startDate: `${Y + 1}-01-01`, endDate: `${Y + 1}-12-31`, closed: false });
    expect(after.body.data[1].closed).toBe(true);
    // Postings in the closed year are refused, even with the lock lifted.
    expect((await owner.put(`${base()}/lock`, { lockedUntil: null })).status).toBe(422);
    const v = await owner.post(`${base()}/vouchers`, { date: D('12-30'), description: 'sent', lines: [{ account: 6110, debit: 100 }, { account: 1930, credit: 100 }] });
    expect(v.status).toBe(422);
    // The balance sheet still balances and the result now sits in 2099.
    const bs = await owner.get(`${base()}/reports/balance-sheet?date=${D('12-31')}`);
    expect(bs.body.data.balanced).toBe(true);
    const equity = bs.body.data.equityAndLiabilities.find((s: any) => s.key === 'equity');
    expect(equity.accounts.find((a: any) => a.number === 2099).amount).toBe(before.body.data.netResult);
    // Opening balances carry over to the new year.
    const tb = await owner.get(`${base()}/reports/trial-balance?from=${Y + 1}-01-01&to=${Y + 1}-01-31`);
    expect(tb.body.data.accounts.find((a: any) => a.number === 2099).opening).toBe(-before.body.data.netResult);
    expect(tb.body.data.accounts.every((a: any) => a.number < 3000)).toBe(true);
  });

  test('audit log records the history', async () => {
    const res = await owner.get(`${base()}/audit-log`);
    const actions = res.body.data.map((a: any) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['company.create', 'invoice.issue', 'bank.book', 'vat.settle', 'fiscal_year.close']));
  });
});

describe('BankID', () => {
  test('login with BankID for a linked account', async () => {
    let collects = 0;
    bankid.setTransport(async (path: string, body: any) => {
      if (path === '/auth') {
        expect(body.endUserIp).toMatch(/\d/);
        return { orderRef: 'ref-1', autoStartToken: 'auto', qrStartToken: 'qrtok', qrStartSecret: 'qrsecret' };
      }
      if (path === '/collect') {
        collects += 1;
        if (collects === 1) return { orderRef: 'ref-1', status: 'pending', hintCode: 'outstandingTransaction' };
        return { orderRef: 'ref-1', status: 'complete', completionData: { user: { personalNumber: '198112189876', name: 'Olle Ägare', givenName: 'Olle', surname: 'Ägare' } } };
      }
      return {};
    });

    // Link BankID to the owner's account.
    const start = await owner.post('/api/auth/bankid/start', { intent: 'link' });
    expect(start.status).toBe(200);
    expect(start.body.qr).toMatch(/^bankid\.qrtok\.\d+\.[0-9a-f]{64}$/);
    expect(JSON.stringify(start.body)).not.toContain('qrsecret');
    expect((await owner.post('/api/auth/bankid/collect')).body).toMatchObject({ status: 'pending', message: 'Starta BankID-appen.' });
    expect((await owner.post('/api/auth/bankid/collect')).body).toMatchObject({ status: 'complete', linked: true });

    // A fresh browser can now log in with BankID.
    collects = 0;
    const browser = new Client(app);
    expect((await browser.agent.post('/api/auth/bankid/start').send({})).status).toBe(200);
    // Another browser cannot collect someone else's order.
    expect((await new Client(app).agent.post('/api/auth/bankid/collect')).status).toBe(404);
    await browser.agent.post('/api/auth/bankid/collect');
    const done = await browser.agent.post('/api/auth/bankid/collect');
    expect(done.body).toMatchObject({ status: 'complete', user: { email: 'owner@example.se' } });
    expect((await browser.get('/api/auth/me')).status).toBe(200);
  });
});
