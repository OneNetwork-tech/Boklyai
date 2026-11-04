/**
 * BankID Relying Party API v6.0 client.
 * https://www.bankid.com/en/utvecklare/guider/teknisk-integrationsguide
 *
 * The RP certificate is used for mutual TLS. qrStartSecret never leaves the
 * server: animated QR codes are computed here and polled by the browser.
 */
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import { config } from '../config';

export interface AuthResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

export interface CollectResponse {
  orderRef: string;
  status: 'pending' | 'failed' | 'complete';
  hintCode?: string;
  completionData?: {
    user: { personalNumber: string; name: string; givenName: string; surname: string };
    device?: { ipAddress: string };
  };
}

export type Transport = (path: string, body: unknown) => Promise<any>;

let agent: https.Agent | null = null;

function rpAgent(): https.Agent {
  if (!agent) {
    const { certPath, keyPath, caPath, passphrase } = config.bankid;
    agent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      ca: fs.readFileSync(caPath),
      passphrase: passphrase || undefined,
      rejectUnauthorized: true,
      keepAlive: true,
    });
  }
  return agent;
}

const httpsTransport: Transport = (path, body) => new Promise((resolve, reject) => {
  const url = new URL(config.bankid.apiUrl.replace(/\/$/, '') + path);
  const payload = JSON.stringify(body);
  const req = https.request(url, {
    method: 'POST',
    agent: rpAgent(),
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    timeout: 15000,
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      let json: any = null;
      try { json = data ? JSON.parse(data) : {}; } catch { /* keep null */ }
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(json);
      else reject(Object.assign(new Error(json?.details || json?.errorCode || `BankID error ${res.statusCode}`), { errorCode: json?.errorCode, status: res.statusCode }));
    });
  });
  req.on('timeout', () => req.destroy(new Error('BankID request timed out')));
  req.on('error', reject);
  req.end(payload);
});

let transport: Transport = httpsTransport;

/** Replace the HTTP transport (tests). */
export function setTransport(t: Transport | null) {
  transport = t || httpsTransport;
}

export function startAuth(endUserIp: string): Promise<AuthResponse> {
  return transport('/auth', { endUserIp, requirement: { pinCode: true } });
}

export function collect(orderRef: string): Promise<CollectResponse> {
  return transport('/collect', { orderRef });
}

export async function cancel(orderRef: string): Promise<void> {
  await transport('/cancel', { orderRef }).catch(() => {});
}

/** Animated QR payload: bankid.<qrStartToken>.<seconds>.<hmac(secret, seconds)>. */
export function qrData(qrStartToken: string, qrStartSecret: string, startedAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const code = crypto.createHmac('sha256', qrStartSecret).update(String(seconds)).digest('hex');
  return `bankid.${qrStartToken}.${seconds}.${code}`;
}

/** User-facing messages for BankID hint codes (Swedish, as recommended by BankID). */
export const HINT_MESSAGES: Record<string, string> = {
  outstandingTransaction: 'Starta BankID-appen.',
  noClient: 'Starta BankID-appen.',
  started: 'Söker efter BankID, det kan ta en liten stund…',
  userSign: 'Skriv in din säkerhetskod i BankID-appen och välj Identifiera.',
  userMrtd: 'Läs av ditt pass eller id-kort i BankID-appen.',
  expiredTransaction: 'BankID-appen svarar inte. Försök igen.',
  certificateErr: 'Det BankID du försöker använda är för gammalt eller spärrat.',
  userCancel: 'Åtgärden avbröts.',
  cancelled: 'Åtgärden avbröts. Försök igen.',
  startFailed: 'BankID-appen verkar inte finnas i din dator eller telefon.',
};
