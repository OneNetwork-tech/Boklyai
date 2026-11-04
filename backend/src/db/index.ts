import { Pool, PoolClient, QueryResultRow, types } from 'pg';
import { config } from '../config';

// Return BIGINT (öre amounts, ids from COUNT) as JS numbers. Amounts are stored
// in öre, so the safe-integer limit (~90 trillion SEK) is never a concern.
types.setTypeParser(20, (v) => Number.parseInt(v, 10));
// NUMERIC (quantities, rates) as numbers.
types.setTypeParser(1700, (v) => Number.parseFloat(v));
// DATE as plain 'YYYY-MM-DD' strings, avoiding timezone shifts.
types.setTypeParser(1082, (v) => v);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 10000,
});

/** Anything that can run a query: the pool or a transaction client. */
export type Db = Pick<Pool, 'query'> | PoolClient;

export async function query<T extends QueryResultRow = any>(db: Db, text: string, params: unknown[] = []): Promise<T[]> {
  const res = await db.query<T>(text, params as any[]);
  return res.rows;
}

export async function one<T extends QueryResultRow = any>(db: Db, text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(db, text, params);
  return rows[0] ?? null;
}

/**
 * Run `fn` in a transaction. All ledger postings go through here so that a
 * voucher, its lines, number allocation and document status changes either all
 * commit or all roll back.
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
