import { BankConnector } from './BankConnector';
import { BankTransaction } from '../BankTransaction';

export class SebConnector implements BankConnector {
  readonly bankCode = 'SEB';

  async fetchTransactions({ accountNumber, startDate, endDate }: {
    accountNumber: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Partial<BankTransaction>[]> {
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    return Array.from({ length: Math.min(days, 10) }, (_, index) => ({
      externalId: `${this.bankCode}-${accountNumber}-${index}`,
      transactionDate: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000),
      amount: Number((Math.cos(index) * 350).toFixed(2)),
      description: index % 3 === 0 ? 'BG Lön' : 'Faktura betalning',
      reference: `SEB-${index}`,
      currency: 'SEK',
      type: index % 2 === 0 ? 'CREDIT' : 'DEBIT'
    }));
  }
}
