// API client. Sessions live in an httpOnly cookie; mutating requests echo the
// CSRF token (from the readable bokly_csrf cookie) in the X-CSRF-Token header.

export class ApiError extends Error {
  status: number;
  details?: { path: string; message: string }[];

  constructor(status: number, message: string, details?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)bokly_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function handle<T>(res: Response, path: string): Promise<T> {
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();
    throw new ApiError(res.status, body.error || `Request failed (${res.status})`, body.details);
  }
  return body as T;
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const method = opts.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken();
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    credentials: 'same-origin',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return handle<T>(res, path);
}

export async function upload<T = any>(path: string, file: File, query?: Query): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(buildUrl(path, query), {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken() },
    credentials: 'same-origin',
    body: form,
  });
  return handle<T>(res, path);
}

export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details?.length) return `${err.message}: ${err.details.map((d) => `${d.path ? `${d.path}: ` : ''}${d.message}`).join('; ')}`;
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
