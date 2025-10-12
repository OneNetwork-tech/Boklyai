import { Account } from './Account';
export declare class Transaction {
    id: number;
    description: string;
    transactionDate: Date;
    amount: number;
    matchedBankTransactionId?: number;
    isMatched: boolean;
    type: 'DEBIT' | 'CREDIT';
    createdAt: Date;
    updatedAt: Date;
    account: Account;
}
//# sourceMappingURL=Transaction.d.ts.map