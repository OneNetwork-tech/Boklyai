import { Transaction } from './Transaction';
export declare class TransactionService {
    private transactionRepository;
    private accountRepository;
    /**
     * Create a new transaction
     * @param accountId Account ID
     * @param description Transaction description
     * @param transactionDate Transaction date
     * @param amount Transaction amount
     * @param type Transaction type (DEBIT or CREDIT)
     */
    createTransaction(accountId: number, description: string, transactionDate: Date, amount: number, type: 'DEBIT' | 'CREDIT'): Promise<Transaction>;
    /**
     * Get all transactions for an account
     * @param accountId Account ID
     */
    getTransactionsByAccount(accountId: number): Promise<Transaction[]>;
    /**
     * Get transaction by ID
     * @param id Transaction ID
     */
    getTransactionById(id: number): Promise<Transaction | null>;
}
//# sourceMappingURL=TransactionService.d.ts.map