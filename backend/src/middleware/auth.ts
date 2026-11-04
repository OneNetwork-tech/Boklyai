import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { one, pool } from '../db';
import { loadSession, Session } from '../services/sessions';
import { forbidden, notFound, unauthorized } from '../utils/errors';

export type Role = 'owner' | 'accountant' | 'member' | 'viewer';
const ROLE_LEVEL: Record<Role, number> = { viewer: 0, member: 1, accountant: 2, owner: 3 };

export interface CompanyContext {
  id: number;
  role: Role;
  name: string;
  orgNumber: string;
  lockedUntil: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session;
      company?: CompanyContext;
    }
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Reject cross-site state-changing requests. Cookies are SameSite=Strict, and
 * we additionally verify the Origin header when the browser sends one.
 */
export function originCheck(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next(); // non-browser clients; CSRF token still required for sessions
  const allowed = new Set([new URL(config.publicUrl).origin, `${req.protocol}://${req.get('host')}`]);
  if (!allowed.has(origin)) return next(forbidden('Cross-origin request rejected'));
  return next();
}

/** Attach req.session when a valid session cookie is present. */
export async function attachSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await loadSession(req);
    if (session) req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

/** Require a logged-in user; mutating requests must carry the CSRF token. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session) return next(unauthorized());
  if (!SAFE_METHODS.has(req.method)) {
    const header = req.get('x-csrf-token') || '';
    if (!timingSafeEqual(header, req.session.csrfToken)) return next(forbidden('Missing or invalid CSRF token'));
  }
  return next();
}

/**
 * Resolve :companyId and the caller's membership. Non-members get 404 so that
 * company ids cannot be probed.
 */
export async function companyAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number.parseInt(req.params.companyId, 10);
    if (!Number.isInteger(id) || id <= 0 || !req.session) throw notFound('Company not found');
    const row = await one(pool, `
      SELECT c.id, c.name, c.org_number, c.locked_until, m.role
        FROM companies c JOIN memberships m ON m.company_id = c.id
       WHERE c.id = $1 AND m.user_id = $2`, [id, req.session.user.id]);
    if (!row) throw notFound('Company not found');
    req.company = { id: row.id, role: row.role, name: row.name, orgNumber: row.org_number, lockedUntil: row.locked_until };
    next();
  } catch (err) {
    next(err);
  }
}

/** Require at least `min` role in the current company. */
export const requireRole = (min: Role) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.company) return next(notFound('Company not found'));
  if (ROLE_LEVEL[req.company.role] < ROLE_LEVEL[min]) return next(forbidden(`Requires ${min} role or higher`));
  return next();
};

export const roleAtLeast = (role: Role, min: Role) => ROLE_LEVEL[role] >= ROLE_LEVEL[min];
