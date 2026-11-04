import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { one, pool, query, transaction } from '../db';
import { requireAuth } from '../middleware/auth';
import { validate, valid } from '../middleware/validate';
import { audit } from '../services/audit';
import { sendMail } from '../services/mailer';
import {
  createSession, destroyAllSessions, destroySession, hashToken, randomToken,
} from '../services/sessions';
import { ah, badRequest, conflict, unauthorized } from '../utils/errors';
import bankidRouter from './bankid';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.auth.loginRateLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 4);

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(12, 'Password must be at least 12 characters').max(200);

const registerSchema = z.object({
  email,
  password,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

const loginSchema = z.object({ email, password: z.string().min(1).max(200) });

export async function userPayload(userId: number) {
  const user = await one(pool, 'SELECT id, email, first_name, last_name, personal_number IS NOT NULL AS bankid_linked FROM users WHERE id = $1', [userId]);
  const companies = await query(pool, `
    SELECT c.id, c.name, c.org_number, m.role
      FROM memberships m JOIN companies c ON c.id = m.company_id
     WHERE m.user_id = $1 ORDER BY c.name`, [userId]);
  return {
    user: user && {
      id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, bankidLinked: user.bankid_linked,
    },
    companies: companies.map((c) => ({ id: c.id, name: c.name, orgNumber: c.org_number, role: c.role })),
  };
}

router.post('/register', limiter, validate(registerSchema), ah(async (req, res) => {
  const body = valid<z.infer<typeof registerSchema>>(req);
  const hash = await bcrypt.hash(body.password, config.auth.bcryptRounds);
  const userId = await transaction(async (c) => {
    const exists = await one(c, 'SELECT 1 FROM users WHERE lower(email) = $1', [body.email]);
    if (exists) throw conflict('An account with this email already exists');
    const user = await one(c, `INSERT INTO users (email, password_hash, first_name, last_name)
                               VALUES ($1, $2, $3, $4) RETURNING id`, [body.email, hash, body.firstName, body.lastName]);
    // Accept pending invitations addressed to this email.
    const invites = await query(c, `UPDATE invitations SET accepted_at = now()
                                     WHERE lower(email) = $1 AND accepted_at IS NULL RETURNING company_id, role`, [body.email]);
    for (const inv of invites) {
      await query(c, `INSERT INTO memberships (company_id, user_id, role) VALUES ($1, $2, $3)
                      ON CONFLICT DO NOTHING`, [inv.company_id, user!.id, inv.role]);
    }
    return user!.id as number;
  });
  const csrfToken = await createSession(req, res, userId);
  res.status(201).json({ ...(await userPayload(userId)), csrfToken });
}));

router.post('/login', limiter, validate(loginSchema), ah(async (req, res) => {
  const body = valid<z.infer<typeof loginSchema>>(req);
  const user = await one(pool, 'SELECT id, password_hash, failed_logins, locked_until FROM users WHERE lower(email) = $1', [body.email]);
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    await bcrypt.compare(body.password, DUMMY_HASH);
    throw unauthorized('Too many failed attempts. The account is temporarily locked.');
  }
  const ok = await bcrypt.compare(body.password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    if (user) {
      await pool.query(`UPDATE users SET failed_logins = failed_logins + 1,
                          locked_until = CASE WHEN failed_logins + 1 >= $2 THEN now() + ($3 || ' minutes')::interval END
                        WHERE id = $1`, [user.id, MAX_FAILED_LOGINS, String(LOCKOUT_MINUTES)]);
    }
    throw unauthorized('Invalid email or password');
  }
  await pool.query('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [user.id]);
  const csrfToken = await createSession(req, res, user.id);
  res.json({ ...(await userPayload(user.id)), csrfToken });
}));

router.post('/logout', ah(async (req, res) => {
  await destroySession(req, res);
  res.status(204).end();
}));

/** Session probe for the SPA: 200 with user=null when signed out (no console noise). */
router.get('/session', ah(async (req, res) => {
  if (!req.session) return res.json({ user: null, companies: [] });
  return res.json({ ...(await userPayload(req.session.user.id)), csrfToken: req.session.csrfToken });
}));

router.get('/me', requireAuth, ah(async (req, res) => {
  res.json({ ...(await userPayload(req.session!.user.id)), csrfToken: req.session!.csrfToken });
}));

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

router.patch('/me', requireAuth, validate(profileSchema), ah(async (req, res) => {
  const body = valid<z.infer<typeof profileSchema>>(req);
  await pool.query('UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3', [body.firstName, body.lastName, req.session!.user.id]);
  res.json(await userPayload(req.session!.user.id));
}));

const changeSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: password });

router.post('/password/change', requireAuth, limiter, validate(changeSchema), ah(async (req, res) => {
  const body = valid<z.infer<typeof changeSchema>>(req);
  const user = await one(pool, 'SELECT password_hash FROM users WHERE id = $1', [req.session!.user.id]);
  if (!user || !(await bcrypt.compare(body.currentPassword, user.password_hash))) throw badRequest('Current password is incorrect');
  const hash = await bcrypt.hash(body.newPassword, config.auth.bcryptRounds);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.session!.user.id]);
  // Sign out every other device.
  await destroyAllSessions(req.session!.user.id, req.session!.id);
  await audit(req, 'password.change', 'user', req.session!.user.id);
  res.status(204).end();
}));

router.post('/password/forgot', limiter, validate(z.object({ email })), ah(async (req, res) => {
  const { email: addr } = valid<{ email: string }>(req);
  const user = await one(pool, 'SELECT id, email FROM users WHERE lower(email) = $1', [addr]);
  if (user) {
    const token = randomToken();
    await pool.query(`INSERT INTO password_resets (user_id, token_hash, expires_at)
                      VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`, [user.id, hashToken(token), String(config.auth.passwordResetMinutes)]);
    const link = `${config.publicUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: 'Återställ ditt lösenord / Reset your password – BoklyAI',
      text: `Använd länken nedan för att välja ett nytt lösenord. Den gäller i ${config.auth.passwordResetMinutes} minuter.\n`
        + `Use the link below to choose a new password. It is valid for ${config.auth.passwordResetMinutes} minutes.\n\n${link}\n\n`
        + 'Om du inte begärde detta kan du ignorera meddelandet. / If you did not request this, ignore this email.',
    });
  }
  // Same response whether or not the account exists.
  res.status(202).json({ message: 'If the address is registered, a reset link has been sent.' });
}));

const resetSchema = z.object({ token: z.string().min(20).max(200), newPassword: password });

router.post('/password/reset', limiter, validate(resetSchema), ah(async (req, res) => {
  const body = valid<z.infer<typeof resetSchema>>(req);
  const hash = await bcrypt.hash(body.newPassword, config.auth.bcryptRounds);
  await transaction(async (c) => {
    const row = await one(c, `UPDATE password_resets SET used_at = now()
                              WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
                              RETURNING user_id`, [hashToken(body.token)]);
    if (!row) throw badRequest('The reset link is invalid or has expired');
    await query(c, 'UPDATE users SET password_hash = $1, failed_logins = 0, locked_until = NULL WHERE id = $2', [hash, row.user_id]);
    // Invalidate other outstanding reset links and every session.
    await query(c, 'UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [row.user_id]);
    await destroyAllSessions(row.user_id, undefined, c);
  });
  res.status(204).end();
}));

router.use('/bankid', bankidRouter);

export default router;
