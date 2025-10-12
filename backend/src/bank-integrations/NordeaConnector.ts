import { BankConnector } from './BankConnector';
import { BankTransaction } from '../BankTransaction';

export class NordeaConnector implements BankConnector {
  readonly bankCode = 'NORDEA';

  async fetchTransactions({ accountNumber, startDate, endDate }: {
    accountNumber: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Partial<BankTransaction>[]> {
    // Simulate Nordic API response with deterministic data for offline mode
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    return Array.from({ length: Math.min(days, 15) }, (_, index) => ({
      externalId: `${this.bankCode}-${accountNumber}-${index}`,
      transactionDate: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000),
      amount: Number((Math.sin(index) * 500).toFixed(2)),
      description: index % 2 === 0 ? 'Kortköp ICA Maxi' : 'Autogiro Skatt',
      reference: `AUTOMATCH-${index}`,
      currency: 'SEK',
      type: index % 2 === 0 ? 'DEBIT' : 'CREDIT'
    }));
  }
}
