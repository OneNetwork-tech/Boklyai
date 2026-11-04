import fs from 'fs';
import { config } from './config';
import { pool } from './db';
import { migrate } from './db/migrate';
import { createApp } from './app';
import { purgeExpiredSessions } from './services/sessions';

async function main() {
  fs.mkdirSync(config.uploads.dir, { recursive: true, mode: 0o700 });
  await migrate();
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`BoklyAI API listening on :${config.port} (${config.env})`);
  });
  const purge = setInterval(() => purgeExpiredSessions().catch(() => {}), 60 * 60 * 1000);
  purge.unref();

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
