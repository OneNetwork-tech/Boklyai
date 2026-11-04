import type { Request } from 'express';
import { Db, pool, query } from '../db';

/** Append an entry to the audit trail (inside the caller's transaction if given). */
export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId: number | null,
  details?: Record<string, unknown>,
  db: Db = pool,
): Promise<void> {
  await query(db, `INSERT INTO audit_log (company_id, user_id, action, entity, entity_id, details, ip)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [req.company?.id ?? null, req.session?.user.id ?? null, action, entity, entityId, details ? JSON.stringify(details) : null, req.ip]);
}
