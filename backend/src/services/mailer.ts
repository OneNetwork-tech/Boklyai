import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Outbox used in tests (and dev without SMTP) instead of sending. */
export const outbox: Mail[] = [];

let transport: Transporter | null = null;

export async function sendMail(mail: Mail): Promise<void> {
  if (!config.mail.smtpUrl) {
    outbox.push(mail);
    if (outbox.length > 100) outbox.shift();
    if (!config.isTest) console.log(`[mail] (SMTP not configured) to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  if (!transport) transport = nodemailer.createTransport(config.mail.smtpUrl);
  await transport.sendMail({ from: config.mail.from, ...mail });
}
