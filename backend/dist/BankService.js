"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankService = void 0;
const database_1 = require("./database");
const Bank_1 = require("./Bank");
const BankAccount_1 = require("./BankAccount");
const BankTransaction_1 = require("./BankTransaction");
const Transaction_1 = require("./Transaction");
class BankService {
    constructor() {
        this.bankRepository = database_1.AppDataSource.getRepository(Bank_1.Bank);
        this.bankAccountRepository = database_1.AppDataSource.getRepository(BankAccount_1.BankAccount);
        this.bankTransactionRepository = database_1.AppDataSource.getRepository(BankTransaction_1.BankTransaction);
        this.transactionRepository = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
    }
    /**
     * Create a new bank
     * @param name Bank name
     * @param code Bank code
     * @param description Bank description
     * @param apiUrl Bank API URL
     * @param authType Bank authentication type
     */
    async createBank(name, code, description, apiUrl, authType) {
        const bank = new Bank_1.Bank();
        bank.name = name;
        bank.code = code;
        bank.description = description || '';
        bank.apiUrl = apiUrl || '';
        bank.authType = authType || '';
        bank.isActive = true;
        return await this.bankRepository.save(bank);
    }
    /**
     * Get all banks
     */
    async getAllBanks() {
        return await this.bankRepository.find({
            where: { isActive: true }
        });
    }
    /**
     * Get bank by ID
     * @param id Bank ID
     */
    async getBankById(id) {
        return await this.bankRepository.findOne({
            where: { id, isActive: true }
        });
    }
    /**
     * Create a new bank account
     * @param companyId Company ID
     * @param bankId Bank ID
     * @param accountName Account name
     * @param accountNumber Account number
     * @param iban IBAN
     * @param bic BIC
     */
    async createBankAccount(companyId, bankId, accountName, accountNumber, iban, bic) {
        const bankAccount = new BankAccount_1.BankAccount();
        // Use relation objects instead of direct IDs
        bankAccount.company = { id: companyId };
        bankAccount.bank = { id: bankId };
        bankAccount.accountName = accountName;
        bankAccount.accountNumber = accountNumber;
        bankAccount.iban = iban || '';
        bankAccount.bic = bic || '';
        bankAccount.balance = 0;
        bankAccount.isActive = true;
        return await this.bankAccountRepository.save(bankAccount);
    }
    /**
     * Get all bank accounts for a company
     * @param companyId Company ID
     */
    async getBankAccountsByCompany(companyId) {
        return await this.bankAccountRepository.find({
            where: {
                company: { id: companyId },
                isActive: true
            },
            relations: ['bank']
        });
    }
    /**
     * Get bank account by ID
     * @param id Bank account ID
     */
    async getBankAccountById(id) {
        return await this.bankAccountRepository.findOne({
            where: { id, isActive: true },
            relations: ['bank', 'company']
        });
    }
    /**
     * Update bank account balance
     * @param id Bank account ID
     * @param balance New balance
     */
    async updateBankAccountBalance(id, balance) {
        const bankAccount = await this.getBankAccountById(id);
        if (!bankAccount) {
            throw new Error('Bank account not found');
        }
        bankAccount.balance = balance;
        return await this.bankAccountRepository.save(bankAccount);
    }
    /**
     * Import bank transactions
     * @param bankAccountId Bank account ID
     * @param transactions Array of transactions to import
     */
    async importBankTransactions(bankAccountId, transactions) {
        const bankAccount = await this.bankAccountRepository.findOneBy({ id: bankAccountId });
        if (!bankAccount) {
            throw new Error('Bank account not found');
        }
        const bankTransactions = [];
        for (const transaction of transactions) {
            const bankTransaction = new BankTransaction_1.BankTransaction();
            // Use relation object instead of direct ID
            bankTransaction.bankAccount = bankAccount;
            bankTransaction.externalId = transaction.externalId;
            bankTransaction.transactionDate = transaction.transactionDate;
            bankTransaction.amount = transaction.amount;
            bankTransaction.description = transaction.description;
            bankTransaction.reference = transaction.reference || '';
            bankTransaction.currency = transaction.currency || 'SEK';
            bankTransaction.type = transaction.type || 'CREDIT';
            bankTransaction.status = 'PENDING';
            bankTransaction.isMatched = false;
            bankTransactions.push(bankTransaction);
        }
        return await this.bankTransactionRepository.save(bankTransactions);
    }
    /**
     * Get bank transactions
     * @param bankAccountId Bank account ID
     * @param limit Number of transactions to retrieve
     */
    async getBankTransactions(bankAccountId, limit) {
        const query = this.bankTransactionRepository.createQueryBuilder('bankTransaction')
            .where('bankTransaction.bankAccount.id = :bankAccountId', { bankAccountId })
            .orderBy('bankTransaction.transactionDate', 'DESC');
        if (limit) {
            query.take(limit);
        }
        return await query.getMany();
    }
    /**
     * Find matches for a bank transaction
     * @param bankTransactionId Bank transaction ID
     */
    async findTransactionMatches(bankTransactionId) {
        const bankTransaction = await this.bankTransactionRepository.findOneBy({ id: bankTransactionId });
        if (!bankTransaction) {
            throw new Error('Bank transaction not found');
        }
        // Find matching transactions based on amount and description
        const transactions = await this.transactionRepository
            .createQueryBuilder('transaction')
            .where('transaction.amount = :amount', { amount: Math.abs(bankTransaction.amount) })
            .andWhere('transaction.description LIKE :description', { description: `%${bankTransaction.description}%` })
            .andWhere('transaction.isMatched = false')
            .getMany();
        return transactions;
    }
    /**
     * Mark a bank transaction as matched
     * @param bankTransactionId Bank transaction ID
     * @param matchedTransactionId Matched transaction ID
     */
    async markTransactionAsMatched(bankTransactionId, matchedTransactionId) {
        const bankTransaction = await this.bankTransactionRepository.findOneBy({ id: bankTransactionId });
        if (!bankTransaction) {
            throw new Error('Bank transaction not found');
        }
        const transaction = await this.transactionRepository.findOneBy({ id: matchedTransactionId });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        bankTransaction.isMatched = true;
        bankTransaction.status = 'CLEARED';
        // Update the transaction with the matched bank transaction ID
        transaction.matchedBankTransactionId = bankTransactionId;
        transaction.isMatched = true;
        await this.transactionRepository.save(transaction);
        return await this.bankTransactionRepository.save(bankTransaction);
    }
}
exports.BankService = BankService;
//# sourceMappingURL=BankService.js.map