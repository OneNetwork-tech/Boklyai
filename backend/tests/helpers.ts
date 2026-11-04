import request from 'supertest';
import type { Express } from 'express';
import { pool } from '../src/db';
import { migrate } from '../src/db/migrate';
import { createApp } from '../src/app';

export async function resetDatabase(): Promise<Express> {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(false);
  return createApp();
}

/** A logged-in browser-like client that keeps cookies and sends the CSRF token. */
export class Client {
  agent: ReturnType<typeof request.agent>;

  csrf = '';

  constructor(app: Express) {
    this.agent = request.agent(app);
  }

  private withCsrf(req: request.Test) {
    return this.csrf ? req.set('X-CSRF-Token', this.csrf) : req;
  }

  get(url: string) { return this.agent.get(url); }

  post(url: string, body?: unknown) { return this.withCsrf(this.agent.post(url)).send(body as any); }

  put(url: string, body?: unknown) { return this.withCsrf(this.agent.put(url)).send(body as any); }

  patch(url: string, body?: unknown) { return this.withCsrf(this.agent.patch(url)).send(body as any); }

  delete(url: string) { return this.withCsrf(this.agent.delete(url)); }

  upload(url: string, field: string, content: Buffer, filename: string) {
    return this.withCsrf(this.agent.post(url)).attach(field, content, filename);
  }

  async register(email: string, password = 'a-long-secure-password', firstName = 'Test', lastName = 'User') {
    const res = await this.agent.post('/api/auth/register').send({ email, password, firstName, lastName });
    if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
    this.csrf = res.body.csrfToken;
    return res.body;
  }

  async login(email: string, password = 'a-long-secure-password') {
    const res = await this.agent.post('/api/auth/login').send({ email, password });
    if (res.status === 200) this.csrf = res.body.csrfToken;
    return res;
  }
}

/** Valid test organisationsnummer / personnummer (Luhn-correct). */
export const ORG = { a: '556677-8899', b: '559012-3450' };

export const kr = (n: number) => Math.round(n * 100);
