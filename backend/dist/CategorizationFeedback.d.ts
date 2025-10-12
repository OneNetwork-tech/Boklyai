import { Transaction } from './Transaction';
import { Category } from './Category';
import { User } from './User';
export declare class CategorizationFeedback {
    id: number;
    transactionId: number;
    categoryId: number;
    userId: number;
    feedbackText: string;
    isCorrect: boolean;
    createdAt: Date;
    transaction: Transaction;
    category: Category;
    user: User;
    matchedBankTransactionId?: number;
    isMatched: boolean;
}
//# sourceMappingURL=CategorizationFeedback.d.ts.map