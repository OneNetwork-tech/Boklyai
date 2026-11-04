import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../config';
import { HttpError } from '../utils/errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    req.socket.destroy();
    return;
  }
  let status = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof HttpError) {
    ({ status, message, details } = err);
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? `File is too large (max ${config.uploads.maxBytes / 1024 / 1024} MB)` : err.message;
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err?.code === '23505') {
    status = 409;
    message = 'This record already exists';
  } else if (err?.code === '23503') {
    status = 409;
    message = 'This record is referenced by other records and cannot be changed';
  } else if (err?.code === '23514') {
    // Check constraint / ledger trigger violations: the DB is the last line of defence.
    status = 422;
    message = err.message || 'The change violates an accounting rule';
  }

  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  const body: Record<string, unknown> = { error: message };
  if (details) body.details = details;
  res.status(status).json(body);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}
