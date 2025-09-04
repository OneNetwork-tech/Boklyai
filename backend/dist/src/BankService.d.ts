import { Bank } from './Bank';
import { BankAccount } from './BankAccount';
import { BankTransaction } from './BankTransaction';
import { Transaction } from './Transaction';
export declare class BankService {
    private bankRepository;
    private bankAccountRepository;
    private bankTransactionRepository;
    private transactionRepository;
    /**
     * Create a new bank
     * @param name Bank name
     * @param code Bank code
     * @param description Bank description
     * @param apiUrl Bank API URL
     * @param authType Bank authentication type
     */
    createBank(name: string, code: string, description?: string, apiUrl?: string, authType?: string): Promise<Bank>;
    /**
     * Get all banks
     */
    getAllBanks(): Promise<Bank[]>;
    /**
     * Get bank by ID
     * @param id Bank ID
     */
    getBankById(id: number): Promise<Bank | null>;
    /**
     * Create a new bank account
     * @param companyId Company ID
     * @param bankId Bank ID
     * @param accountName Account name
     * @param accountNumber Account number
     * @param iban IBAN
     * @param bic BIC
     */
    createBankAccount(companyId: number, bankId: number, accountName: string, accountNumber: string, iban?: string, bic?: string): Promise<BankAccount>;
    /**
     * Get all bank accounts for a company
     * @param companyId Company ID
     */
    getBankAccountsByCompany(companyId: number): Promise<BankAccount[]>;
    /**
     * Get bank account by ID
     * @param id Bank account ID
     */
    getBankAccountById(id: number): Promise<BankAccount | null>;
    /**
     * Update bank account balance
     * @param id Bank account ID
     * @param balance New balance
     */
    updateBankAccountBalance(id: number, balance: number): Promise<BankAccount>;
    /**
     * Import bank transactions
     * @param bankAccountId Bank account ID
     * @param transactions Array of transactions to import
     */
    importBankTransactions(bankAccountId: number, transactions: Array<{
        externalId: string;
        transactionDate: Date;
        amount: number;
        description: string;
        reference?: string;
        currency?: string;
        type?: string;
    }>): Promise<BankTransaction[]>;
    /**
     * Get bank transactions
     * @param bankAccountId Bank account ID
     * @param limit Number of transactions to retrieve
     */
    getBankTransactions(bankAccountId: number, limit?: number): Promise<BankTransaction[]>;
    /**
     * Find matches for a bank transaction
     * @param bankTransactionId Bank transaction ID
     */
    findTransactionMatches(bankTransactionId: number): Promise<Transaction[]>;
    /**
     * Mark a bank transaction as matched
     * @param bankTransactionId Bank transaction ID
     * @param matchedTransactionId Matched transaction ID
     */
    markTransactionAsMatched(bankTransactionId: number, matchedTransactionId: number): Promise<BankTransaction>;
}
//# sourceMappingURL=BankService.d.ts.map