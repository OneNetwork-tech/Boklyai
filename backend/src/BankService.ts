import { AppDataSource } from './database';
import { Bank } from './Bank';
import { BankAccount } from './BankAccount';
import { BankTransaction } from './BankTransaction';
import { Transaction } from './Transaction';
import { Company } from './Company';

export class BankService {
  private bankRepository = AppDataSource.getRepository(Bank);
  private bankAccountRepository = AppDataSource.getRepository(BankAccount);
  private bankTransactionRepository = AppDataSource.getRepository(BankTransaction);
  private transactionRepository = AppDataSource.getRepository(Transaction);

  /**
   * Create a new bank
   * @param name Bank name
   * @param code Bank code
   * @param description Bank description
   * @param apiUrl Bank API URL
   * @param authType Bank authentication type
   */
  async createBank(
    name: string,
    code: string,
    description?: string,
    apiUrl?: string,
    authType?: string
  ): Promise<Bank> {
    const bank = new Bank();
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
  async getAllBanks(): Promise<Bank[]> {
    return await this.bankRepository.find({
      where: { isActive: true }
    });
  }

  /**
   * Get bank by ID
   * @param id Bank ID
   */
  async getBankById(id: number): Promise<Bank | null> {
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
  async createBankAccount(
    companyId: number,
    bankId: number,
    accountName: string,
    accountNumber: string,
    iban?: string,
    bic?: string
  ): Promise<BankAccount> {
    const bankAccount = new BankAccount();
    
    // Use relation objects instead of direct IDs
    bankAccount.company = { id: companyId } as Company;
    bankAccount.bank = { id: bankId } as Bank;
    
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
  async getBankAccountsByCompany(companyId: number): Promise<BankAccount[]> {
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
  async getBankAccountById(id: number): Promise<BankAccount | null> {
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
  async updateBankAccountBalance(id: number, balance: number): Promise<BankAccount> {
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
  async importBankTransactions(
    bankAccountId: number,
    transactions: Array<{
      externalId: string;
      transactionDate: Date;
      amount: number;
      description: string;
      reference?: string;
      currency?: string;
      type?: string;
    }>
  ): Promise<BankTransaction[]> {
    const bankAccount = await this.bankAccountRepository.findOneBy({ id: bankAccountId });
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    const bankTransactions: BankTransaction[] = [];
    for (const transaction of transactions) {
      const bankTransaction = new BankTransaction();
      
      // Use relation object instead of direct ID
      bankTransaction.bankAccount = bankAccount;
      
      bankTransaction.externalId = transaction.externalId;
      bankTransaction.transactionDate = transaction.transactionDate;
      bankTransaction.amount = transaction.amount;
      bankTransaction.description = transaction.description;
      bankTransaction.reference = transaction.reference || '';
      bankTransaction.currency = transaction.currency || 'SEK';
      bankTransaction.type = (transaction.type as 'CREDIT' | 'DEBIT') || 'CREDIT';
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
  async getBankTransactions(bankAccountId: number, limit?: number): Promise<BankTransaction[]> {
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
  async findTransactionMatches(bankTransactionId: number): Promise<Transaction[]> {
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
  async markTransactionAsMatched(
    bankTransactionId: number,
    matchedTransactionId: number
  ): Promise<BankTransaction> {
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