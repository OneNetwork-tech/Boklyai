import type { PostingLine } from './ledger';

/** A signed amount as a one-sided ledger line: positive = debit, negative = credit. */
export function signed(account: number, amount: number, description = ''): PostingLine {
  return amount >= 0 ? { account, debit: amount, description } : { account, credit: -amount, description };
}

/** Merge lines per account+side so vouchers stay compact (e.g. many 3001 lines). */
export function consolidate(lines: PostingLine[]): PostingLine[] {
  const net = new Map<number, number>();
  const order: number[] = [];
  for (const l of lines) {
    if (!net.has(l.account)) order.push(l.account);
    net.set(l.account, (net.get(l.account) || 0) + (l.debit || 0) - (l.credit || 0));
  }
  return order.filter((a) => net.get(a) !== 0).map((a) => signed(a, net.get(a)!));
}
