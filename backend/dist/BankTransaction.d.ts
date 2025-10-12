import { BankAccount } from './BankAccount';
export declare class BankTransaction {
    id: number;
    externalId: string;
    transactionDate: Date;
    amount: number;
    description: string;
    reference: string;
    currency: string;
    status: 'PENDING' | 'CLEARED' | 'FAILED';
    type: 'CREDIT' | 'DEBIT';
    isMatched: boolean;
    matchedTransactionId: number;
    createdAt: Date;
    updatedAt: Date;
    bankAccount: BankAccount;
}
//# sourceMappingURL=BankTransaction.d.ts.map