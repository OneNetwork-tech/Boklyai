import { BankConnector } from './BankConnector';
import { BankTransaction } from '../BankTransaction';

export class SwishConnector implements BankConnector {
  readonly bankCode = 'SWISH';

  async fetchTransactions({ accountNumber, startDate, endDate }: {
    accountNumber: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Partial<BankTransaction>[]> {
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    return Array.from({ length: Math.min(days, 20) }, (_, index) => ({
      externalId: `${this.bankCode}-${accountNumber}-${index}`,
      transactionDate: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000),
      amount: Number(((index + 1) * 75.5).toFixed(2)),
      description: 'Swish betalning',
      reference: `SWISH-${index}`,
      currency: 'SEK',
      type: 'CREDIT'
    }));
  }
}
