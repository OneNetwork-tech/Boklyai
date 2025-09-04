import { Transaction } from './Transaction';
import { Category } from './Category';
import { User } from './User';
export declare class TransactionCategory {
    id: number;
    transactionId: number;
    categoryId: number;
    confidence: number;
    source: string;
    isManual: boolean;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    transaction: Transaction;
    category: Category;
    user: User;
}
//# sourceMappingURL=TransactionCategory.d.ts.map