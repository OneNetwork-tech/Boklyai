import { BankTransaction } from '../BankTransaction';

export interface BankConnector {
  readonly bankCode: string;
  fetchTransactions(options: {
    accountNumber: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Partial<BankTransaction>[]>;
}
