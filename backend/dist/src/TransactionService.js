"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const database_1 = require("./database");
const Transaction_1 = require("./Transaction");
const Account_1 = require("./Account");
class TransactionService {
    constructor() {
        this.transactionRepository = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
    }
    /**
     * Create a new transaction
     * @param accountId Account ID
     * @param description Transaction description
     * @param transactionDate Transaction date
     * @param amount Transaction amount
     * @param type Transaction type (DEBIT or CREDIT)
     */
    async createTransaction(accountId, description, transactionDate, amount, type) {
        const account = await this.accountRepository.findOneBy({ id: accountId });
        if (!account) {
            throw new Error('Account not found');
        }
        const transaction = new Transaction_1.Transaction();
        transaction.account = account;
        transaction.description = description;
        transaction.transactionDate = transactionDate;
        transaction.amount = amount;
        transaction.type = type;
        // Save the transaction
        const savedTransaction = await this.transactionRepository.save(transaction);
        // Update account balance
        if (type === 'DEBIT') {
            account.balance += amount;
        }
        else {
            account.balance -= amount;
        }
        await this.accountRepository.save(account);
        return savedTransaction;
    }
    /**
     * Get all transactions for an account
     * @param accountId Account ID
     */
    async getTransactionsByAccount(accountId) {
        return await this.transactionRepository.find({
            where: {
                account: { id: accountId }
            },
            order: {
                transactionDate: 'DESC',
                createdAt: 'DESC'
            }
        });
    }
    /**
     * Get transaction by ID
     * @param id Transaction ID
     */
    async getTransactionById(id) {
        return await this.transactionRepository.findOne({
            where: { id }
        });
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=TransactionService.js.map