import fs from 'fs';
import os from 'os';
import path from 'path';

// Runs before modules load in each test file. Tests need a real PostgreSQL;
// the schema is dropped and recreated per test file.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://boklyai:boklyai@localhost:5432/boklyai_test';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough';
process.env.PUBLIC_URL = 'http://localhost:3000';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'boklyai-test-'));
process.env.BANKID_ENABLED = 'true';
process.env.SMTP_URL = '';
