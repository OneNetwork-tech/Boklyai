import { TransactionCategory } from './TransactionCategory';
import { CategorizationFeedback } from './CategorizationFeedback';
export declare class Category {
    id: number;
    name: string;
    code: string;
    description: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    isActive: boolean;
    parentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    transactionCategories: TransactionCategory[];
    categorizationFeedback: CategorizationFeedback[];
}
//# sourceMappingURL=Category.d.ts.map