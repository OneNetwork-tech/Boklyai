import crypto from 'crypto';
import type { Request, Response } from 'express';
import { config } from '../config';
import { one, query, Db, pool } from '../db';

export interface SessionUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Session {
  id: number;
  user: SessionUser;
  csrfToken: string;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const hashToken = sha256;

function cookieOptions(maxAgeMs: number, httpOnly: boolean) {
  return {
    httpOnly,
    secure: config.session.secureCookies,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}

/** Create a session for `userId`, set cookies, and return the CSRF token. */
export async function createSession(req: Request, res: Response, userId: number, db: Db = pool): Promise<string> {
  const token = randomToken();
  const csrf = randomToken(24);
  const maxAgeMs = config.session.absoluteTimeoutHours * 3600 * 1000;
  await query(db, `INSERT INTO sessions (user_id, token_hash, csrf_token, ip, user_agent, expires_at)
                   VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' hours')::interval)`,
  [userId, sha256(token), csrf, req.ip, (req.get('user-agent') || '').slice(0, 300), String(config.session.absoluteTimeoutHours)]);
  res.cookie(config.session.cookieName, token, cookieOptions(maxAgeMs, true));
  // Readable by the SPA so it can echo it in the X-CSRF-Token header.
  res.cookie(config.session.csrfCookieName, csrf, cookieOptions(maxAgeMs, false));
  return csrf;
}

/** Look up the session from the request cookie, enforcing idle and absolute expiry. */
export async function loadSession(req: Request): Promise<Session | null> {
  const token = req.cookies?.[config.session.cookieName];
  if (!token || typeof token !== 'string') return null;
  const row = await one(pool, `
    SELECT s.id, s.csrf_token, s.last_seen_at, u.id AS user_id, u.email, u.first_name, u.last_name
      FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()
       AND s.last_seen_at > now() - ($2 || ' minutes')::interval`,
  [sha256(token), String(config.session.idleTimeoutMinutes)]);
  if (!row) return null;
  // Sliding idle timeout; write at most once a minute.
  if (Date.now() - new Date(row.last_seen_at).getTime() > 60000) {
    await pool.query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [row.id]);
  }
  return {
    id: row.id,
    csrfToken: row.csrf_token,
    user: { id: row.user_id, email: row.email, first_name: row.first_name, last_name: row.last_name },
  };
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[config.session.cookieName];
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  res.clearCookie(config.session.cookieName, { path: '/' });
  res.clearCookie(config.session.csrfCookieName, { path: '/' });
}

export async function destroyAllSessions(userId: number, exceptSessionId?: number, db: Db = pool): Promise<void> {
  await query(db, 'DELETE FROM sessions WHERE user_id = $1 AND ($2::bigint IS NULL OR id <> $2)', [userId, exceptSessionId ?? null]);
}

export async function purgeExpiredSessions(): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE expires_at < now()
                     OR last_seen_at < now() - ($1 || ' minutes')::interval`, [String(config.session.idleTimeoutMinutes)]);
  await pool.query('DELETE FROM password_resets WHERE expires_at < now() - interval \'1 day\'');
}
