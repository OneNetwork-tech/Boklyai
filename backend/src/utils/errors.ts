import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have permission to do this') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
export const unprocessable = (msg: string, details?: unknown) => new HttpError(422, msg, details);

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

/** Forward async errors to the error middleware. */
export const ah = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
