import path from 'path';
import crypto from 'crypto';

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isTest = env === 'test';

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const v = Number.parseInt(raw, 10);
  if (Number.isNaN(v)) throw new Error(`${name} must be an integer`);
  return v;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) {
    if (isProduction && s.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
    return s;
  }
  if (isProduction) throw new Error('SESSION_SECRET is required in production');
  return crypto.randomBytes(32).toString('hex');
}

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = encodeURIComponent(process.env.POSTGRES_USER || 'boklyai');
  const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD || '');
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'boklyai';
  return `postgres://${user}${pass ? `:${pass}` : ''}@${host}:${port}/${db}`;
}

const root = path.resolve(__dirname, '..', '..');

export const config = {
  env,
  isProduction,
  isTest,
  port: int('PORT', 3000),
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${int('PORT', 3000)}`,
  trustProxy: process.env.TRUST_PROXY || 'loopback',
  // Served over HTTPS (CSP upgrade-insecure-requests + HSTS). Set HTTPS_ONLY=false to test over plain HTTP on a LAN.
  httpsOnly: bool('HTTPS_ONLY', isProduction),
  databaseUrl: databaseUrl(),
  databaseSsl: bool('POSTGRES_SSL', false),

  session: {
    secret: sessionSecret(),
    cookieName: 'bokly_session',
    csrfCookieName: 'bokly_csrf',
    idleTimeoutMinutes: int('SESSION_IDLE_MINUTES', 60),
    absoluteTimeoutHours: int('SESSION_MAX_HOURS', 12),
    secureCookies: bool('SECURE_COOKIES', isProduction),
  },

  auth: {
    bcryptRounds: int('BCRYPT_ROUNDS', isTest ? 4 : 12),
    passwordResetMinutes: 60,
    loginRateLimit: isTest ? 1000 : int('LOGIN_RATE_LIMIT', 10),
  },

  uploads: {
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(root, 'uploads')),
    maxBytes: int('MAX_UPLOAD_MB', 15) * 1024 * 1024,
  },

  mail: {
    smtpUrl: process.env.SMTP_URL || '',
    from: process.env.MAIL_FROM || 'BoklyAI <no-reply@boklyai.local>',
  },

  bankid: {
    enabled: bool('BANKID_ENABLED', false),
    apiUrl: process.env.BANKID_API_URL || 'https://appapi2.test.bankid.com/rp/v6.0',
    certPath: process.env.BANKID_CERT_PATH || '',
    keyPath: process.env.BANKID_KEY_PATH || '',
    caPath: process.env.BANKID_CA_PATH || '',
    passphrase: process.env.BANKID_PASSPHRASE || '',
  },

  ocr: {
    tesseractPath: process.env.TESSERACT_PATH || 'tesseract',
    pdftotextPath: process.env.PDFTOTEXT_PATH || 'pdftotext',
  },

  staticDir: process.env.STATIC_DIR || path.join(root, '..', 'frontend', 'dist'),
};

export type Config = typeof config;
