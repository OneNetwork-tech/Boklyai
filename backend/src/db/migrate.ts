import fs from 'fs';
import path from 'path';
import { pool, transaction } from './index';

const dir = path.join(__dirname, 'migrations');

/** Apply pending *.sql migrations in lexical order, each in its own transaction. */
export async function migrate(log = true): Promise<string[]> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await transaction(async (c) => {
      // Serialise concurrent migrators (e.g. two replicas starting at once).
      await c.query('SELECT pg_advisory_xact_lock(727274)');
      const again = await c.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (again.rowCount) return;
      await c.query(sql);
      await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      done.push(file);
    });
    if (log) console.log(`[db] applied ${file}`);
  }
  return done;
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
