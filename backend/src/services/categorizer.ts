/**
 * Bank transaction categorisation ("AI-bokföring").
 *
 * Suggestions come from, in order of confidence:
 *  1. Matching open customer invoices (OCR reference or exact amount) and booked
 *     supplier invoices (payment reference, supplier name, exact amount).
 *  2. Rules learned from this company's own past bookings: description tokens
 *     → account/VAT rate, weighted by how often they were used.
 *  3. Built-in keyword defaults for common Swedish merchants and charges.
 */
import type { PoolClient } from 'pg';
import { Db, query } from '../db';

const STOPWORDS = new Set([
  'kortköp', 'kortkop', 'köp', 'kop', 'betalning', 'bg', 'pg', 'bankgiro', 'plusgiro', 'överföring', 'overforing', 'insättning',
  'uttag', 'sek', 'kr', 'ab', 'hb', 'kb', 'the', 'och', 'med', 'för', 'www', 'com', 'se', 'reservation', 'res', 'swish', 'autogiro',
  'betaln', 'inbetalning', 'utbetalning', 'lön', 'kort', 'card', 'payment',
]);

export function tokenize(description: string): string[] {
  const tokens = description
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-zåäöéü\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return [...new Set(tokens)].slice(0, 12);
}

interface DefaultRule {
  pattern: RegExp;
  account: number;
  vatRate: 0 | 6 | 12 | 25;
  label: string;
}

/** Outgoing payments (amount < 0). */
const EXPENSE_DEFAULTS: DefaultRule[] = [
  { pattern: /\b(circle k|preem|okq8|st1|ingo|shell|tanka)\b/i, account: 5611, vatRate: 25, label: 'Drivmedel' },
  { pattern: /\b(sj|sl|västtrafik|skånetrafiken|flixbus|norwegian|sas|ryanair|taxi|uber|bolt)\b/i, account: 5800, vatRate: 6, label: 'Resor' },
  { pattern: /\b(telia|tele2|telenor|tre|hallon|comviq)\b/i, account: 6212, vatRate: 25, label: 'Mobiltelefon' },
  { pattern: /\b(bahnhof|bredband|ownit|telia bredband|com hem)\b/i, account: 6230, vatRate: 25, label: 'Datakommunikation' },
  { pattern: /\b(google|microsoft|adobe|github|slack|zoom|dropbox|atlassian|notion|aws|amazon web|openai|anthropic|fortnox|visma)\b/i, account: 6540, vatRate: 25, label: 'IT-tjänster' },
  { pattern: /\b(postnord|dhl|ups|schenker|budbee|instabox)\b/i, account: 6250, vatRate: 25, label: 'Frakt och porto' },
  { pattern: /\b(staples|lyreco|kontorsgiganten|clas ohlson|biltema|jula|bauhaus)\b/i, account: 5460, vatRate: 25, label: 'Förbrukningsmaterial' },
  { pattern: /\b(if skadeförsäkring|trygg hansa|folksam|länsförsäkringar|försäkring)\b/i, account: 6310, vatRate: 0, label: 'Försäkring' },
  { pattern: /\b(avgift|månadsavgift|årsavgift|bankavgift|kontoavgift|pris)\b/i, account: 6570, vatRate: 0, label: 'Bankkostnad' },
  { pattern: /\b(hyra|lokalhyra)\b/i, account: 5010, vatRate: 25, label: 'Lokalhyra' },
  { pattern: /\b(restaurang|café|cafe|lunch|middag)\b/i, account: 6071, vatRate: 12, label: 'Representation' },
  { pattern: /\b(skatteverket|skattekonto)\b/i, account: 1630, vatRate: 0, label: 'Skattekonto' },
  { pattern: /\b(facebook|meta|linkedin|google ads|annons)\b/i, account: 5910, vatRate: 25, label: 'Annonsering' },
];

/** Incoming payments (amount > 0). */
const INCOME_DEFAULTS: DefaultRule[] = [
  { pattern: /\b(ränta|interest)\b/i, account: 8310, vatRate: 0, label: 'Ränteintäkt' },
  { pattern: /\b(skatteverket|skatteåterbäring)\b/i, account: 1630, vatRate: 0, label: 'Skattekonto' },
];

export interface AccountSuggestion {
  type: 'account';
  account: number;
  vatRate: number;
  confidence: number;
  reason: string;
}

export async function suggestAccounts(db: Db, companyId: number, description: string, amount: number): Promise<AccountSuggestion[]> {
  const tokens = tokenize(description);
  const out: AccountSuggestion[] = [];
  if (tokens.length) {
    const rows = await query(db, `
      SELECT account_number, vat_rate, SUM(hits) AS score, array_agg(token) AS tokens
        FROM categorization_rules WHERE company_id = $1 AND token = ANY($2::text[])
       GROUP BY account_number, vat_rate ORDER BY score DESC LIMIT 3`, [companyId, tokens]);
    const best = rows[0]?.score || 1;
    for (const r of rows) {
      // Direction matters: don't suggest expense accounts for incoming money and vice versa.
      const isRevenue = r.account_number >= 3000 && r.account_number < 4000;
      if ((amount > 0 && r.account_number >= 4000 && r.account_number < 8000) || (amount < 0 && isRevenue)) continue;
      out.push({
        type: 'account',
        account: r.account_number,
        vatRate: r.vat_rate,
        confidence: Math.min(0.95, 0.5 + 0.45 * (r.score / best) * Math.min(1, r.score / 3)),
        reason: `Learned from earlier bookings (${r.tokens.join(', ')})`,
      });
    }
  }
  for (const rule of amount < 0 ? EXPENSE_DEFAULTS : INCOME_DEFAULTS) {
    if (rule.pattern.test(description) && !out.some((s) => s.account === rule.account)) {
      out.push({ type: 'account', account: rule.account, vatRate: rule.vatRate, confidence: 0.45, reason: `Common pattern: ${rule.label}` });
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/** Remember how a transaction was booked so similar ones are suggested next time. */
export async function learn(c: PoolClient, companyId: number, description: string, account: number, vatRate: number) {
  for (const token of tokenize(description)) {
    await c.query(`INSERT INTO categorization_rules (company_id, token, account_number, vat_rate) VALUES ($1, $2, $3, $4)
                   ON CONFLICT (company_id, token, account_number, vat_rate)
                   DO UPDATE SET hits = categorization_rules.hits + 1, updated_at = now()`, [companyId, token, account, vatRate]);
  }
}

export interface MatchSuggestion {
  type: 'invoice' | 'bill';
  id: number;
  label: string;
  remaining: number;
  confidence: number;
  reason: string;
}

export async function suggestMatches(db: Db, companyId: number, description: string, amount: number): Promise<MatchSuggestion[]> {
  const digits = description.replace(/\D+/g, ' ').trim().split(' ').filter((d) => d.length >= 4);
  if (amount > 0) {
    const rows = await query(db, `
      SELECT i.id, i.invoice_number, i.ocr_reference, i.total_amount - i.paid_amount AS remaining, c.name
        FROM invoices i JOIN customers c ON c.id = i.customer_id
       WHERE i.company_id = $1 AND i.status = 'issued' AND i.kind = 'invoice'
         AND (i.total_amount - i.paid_amount = $2 OR i.ocr_reference = ANY($3::text[]) OR i.invoice_number::text = ANY($3::text[]))
       LIMIT 5`, [companyId, amount, digits]);
    return rows.map((r) => {
      const ocrHit = digits.includes(r.ocr_reference) || digits.includes(String(r.invoice_number));
      const amountHit = r.remaining === amount;
      return {
        type: 'invoice' as const,
        id: r.id,
        label: `Faktura ${r.invoice_number} – ${r.name}`,
        remaining: r.remaining,
        confidence: ocrHit && amountHit ? 0.99 : ocrHit ? 0.8 : 0.7,
        reason: [ocrHit && 'OCR/invoice number in text', amountHit && 'amount matches'].filter(Boolean).join(', '),
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }
  const rows = await query(db, `
    SELECT b.id, b.supplier_invoice_number, b.payment_reference, b.total_amount - b.paid_amount AS remaining, s.name
      FROM bills b JOIN suppliers s ON s.id = b.supplier_id
     WHERE b.company_id = $1 AND b.status = 'booked' AND b.total_amount - b.paid_amount = $2
     LIMIT 5`, [companyId, -amount]);
  const lower = description.toLowerCase();
  return rows.map((r) => {
    const refHit = Boolean(r.payment_reference) && digits.includes(r.payment_reference);
    const nameHit = r.name.toLowerCase().split(/\s+/).some((w: string) => w.length >= 4 && lower.includes(w));
    return {
      type: 'bill' as const,
      id: r.id,
      label: `Leverantörsfaktura ${r.supplier_invoice_number || r.id} – ${r.name}`,
      remaining: r.remaining,
      confidence: refHit ? 0.98 : nameHit ? 0.9 : 0.65,
      reason: ['amount matches', refHit && 'payment reference in text', nameHit && 'supplier name in text'].filter(Boolean).join(', '),
    };
  }).sort((a, b) => b.confidence - a.confidence);
}
