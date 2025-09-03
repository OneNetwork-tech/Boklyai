import { AppDataSource } from './database';
import { Transaction } from './Transaction';
import { Account } from './Account';

export class TransactionService {
  private transactionRepository = AppDataSource.getRepository(Transaction);
  private accountRepository = AppDataSource.getRepository(Account);

  /**
   * Create a new transaction
   * @param accountId Account ID
   * @param description Transaction description
   * @param transactionDate Transaction date
   * @param amount Transaction amount
   * @param type Transaction type (DEBIT or CREDIT)
   */
  async createTransaction(
    accountId: number,
    description: string,
    transactionDate: Date,
    amount: number,
    type: 'DEBIT' | 'CREDIT'
  ): Promise<Transaction> {
    const account = await this.accountRepository.findOneBy({ id: accountId });
    if (!account) {
      throw new Error('Account not found');
    }

    const transaction = new Transaction();
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
    } else {
      account.balance -= amount;
    }
    await this.accountRepository.save(account);

    return savedTransaction;
  }

  /**
   * Get all transactions for an account
   * @param accountId Account ID
   */
  async getTransactionsByAccount(accountId: number): Promise<Transaction[]> {
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
  async getTransactionById(id: number): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: { id }
    });
  }
}