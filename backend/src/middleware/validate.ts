import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { badRequest } from '../utils/errors';
import { isIsoDate } from '../utils/dates';

/** Validate req.body / req.query and store the parsed value on req.valid. */
export function validate<T extends z.ZodType>(schema: T, part: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      return next(badRequest('Validation failed', result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))));
    }
    (req as any).valid = { ...((req as any).valid || {}), [part]: result.data };
    return next();
  };
}

export function valid<T>(req: Request, part: 'body' | 'query' = 'body'): T {
  return (req as any).valid?.[part] as T;
}

// Reusable schema pieces ------------------------------------------------------

export const isoDate = z.string().refine(isIsoDate, 'Must be a date (YYYY-MM-DD)');
/** Amount in öre: an integer, |x| < 10^13 (100 billion SEK). */
export const ore = z.number().int('Amounts are integers in öre').refine((n) => Math.abs(n) < 1e13, 'Amount too large');
export const positiveOre = ore.refine((n) => n > 0, 'Must be greater than zero');
export const accountNumber = z.number().int().min(1000).max(9999);
export const vatRate = z.union([z.literal(0), z.literal(6), z.literal(12), z.literal(25)]);
export const idParam = (v: string) => {
  const n = Number.parseInt(v, 10);
  if (!Number.isInteger(n) || n <= 0 || String(n) !== v) throw badRequest('Invalid id');
  return n;
};
export const text = (max = 500) => z.string().trim().max(max);
export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
