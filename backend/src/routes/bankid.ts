import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { one, pool } from '../db';
import { validate, valid } from '../middleware/validate';
import * as bankid from '../services/bankid';
import { createSession, randomToken } from '../services/sessions';
import { normalizePersonalNumber } from '../utils/swedish';
import { ah, badRequest, conflict, forbidden, notFound, HttpError } from '../utils/errors';
import { userPayload } from './auth';

const router = Router();
const COOKIE = 'bokly_bankid';
const ORDER_TTL_MS = 3 * 60 * 1000;

interface Order {
  orderRef: string;
  qrStartToken: string;
  qrStartSecret: string;
  startedAt: number;
  intent: 'login' | 'link';
  userId: number | null;
}

// Orders are short-lived (BankID expires them after ~30s/3min); memory is enough
// for a single instance. The handle is bound to the browser via an httpOnly cookie.
const orders = new Map<string, Order>();

function prune() {
  const now = Date.now();
  for (const [k, o] of orders) if (now - o.startedAt > ORDER_TTL_MS) orders.delete(k);
}

function currentOrder(req: Request): [string, Order] {
  const handle = req.cookies?.[COOKIE];
  const order = handle ? orders.get(handle) : undefined;
  if (!handle || !order) throw notFound('No BankID order in progress');
  return [handle, order];
}

function ensureEnabled() {
  if (!config.bankid.enabled) throw new HttpError(503, 'BankID is not configured on this server');
}

router.get('/status', (req, res) => {
  res.json({ enabled: config.bankid.enabled });
});

router.post('/start', validate(z.object({ intent: z.enum(['login', 'link']).default('login') })), ah(async (req: Request, res: Response) => {
  ensureEnabled();
  prune();
  const { intent } = valid<{ intent: 'login' | 'link' }>(req);
  if (intent === 'link' && !req.session) throw forbidden('Sign in first to link BankID');
  if (intent === 'link' && req.get('x-csrf-token') !== req.session!.csrfToken) throw forbidden('Missing or invalid CSRF token');
  // BankID requires the end user's IP as seen by us (never trust a client-supplied value).
  const endUserIp = (req.ip || '').replace(/^::ffff:/, '') || '127.0.0.1';
  const r = await bankid.startAuth(endUserIp);
  const handle = randomToken();
  orders.set(handle, {
    orderRef: r.orderRef,
    qrStartToken: r.qrStartToken,
    qrStartSecret: r.qrStartSecret,
    startedAt: Date.now(),
    intent,
    userId: req.session?.user.id ?? null,
  });
  res.cookie(COOKIE, handle, {
    httpOnly: true, secure: config.session.secureCookies, sameSite: 'strict', path: '/api/auth/bankid', maxAge: ORDER_TTL_MS,
  });
  res.json({ autoStartToken: r.autoStartToken, qr: bankid.qrData(r.qrStartToken, r.qrStartSecret, Date.now()) });
}));

router.get('/qr', ah(async (req, res) => {
  ensureEnabled();
  const [, order] = currentOrder(req);
  res.set('Cache-Control', 'no-store').json({ qr: bankid.qrData(order.qrStartToken, order.qrStartSecret, order.startedAt) });
}));

router.post('/collect', ah(async (req, res) => {
  ensureEnabled();
  const [handle, order] = currentOrder(req);
  const r = await bankid.collect(order.orderRef);
  if (r.status === 'pending') {
    return res.json({ status: 'pending', hintCode: r.hintCode, message: bankid.HINT_MESSAGES[r.hintCode || ''] || '' });
  }
  orders.delete(handle);
  res.clearCookie(COOKIE, { path: '/api/auth/bankid' });
  if (r.status === 'failed') {
    return res.json({ status: 'failed', hintCode: r.hintCode, message: bankid.HINT_MESSAGES[r.hintCode || ''] || 'BankID-identifieringen misslyckades.' });
  }
  const pnr = normalizePersonalNumber(r.completionData?.user.personalNumber || '');
  if (!pnr) throw badRequest('BankID returned an invalid personal number');

  if (order.intent === 'link') {
    const taken = await one(pool, 'SELECT id FROM users WHERE personal_number = $1 AND id <> $2', [pnr, order.userId]);
    if (taken) throw conflict('This BankID is already linked to another account');
    await pool.query('UPDATE users SET personal_number = $1 WHERE id = $2', [pnr, order.userId]);
    return res.json({ status: 'complete', linked: true });
  }
  const user = await one(pool, 'SELECT id FROM users WHERE personal_number = $1', [pnr]);
  if (!user) {
    throw notFound('No account is linked to this BankID. Sign in with email and password and link BankID under Account settings.');
  }
  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  const csrfToken = await createSession(req, res, user.id);
  return res.json({ status: 'complete', ...(await userPayload(user.id)), csrfToken });
}));

router.post('/cancel', ah(async (req, res) => {
  ensureEnabled();
  const handle = req.cookies?.[COOKIE];
  const order = handle ? orders.get(handle) : undefined;
  if (order) {
    orders.delete(handle);
    await bankid.cancel(order.orderRef);
  }
  res.clearCookie(COOKIE, { path: '/api/auth/bankid' });
  res.status(204).end();
}));

export default router;
