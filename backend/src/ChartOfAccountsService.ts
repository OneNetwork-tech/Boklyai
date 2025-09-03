import { AppDataSource } from './database';
import { ChartOfAccounts } from './ChartOfAccounts';
import { Account } from './Account';

export class ChartOfAccountsService {
  private chartOfAccountsRepository = AppDataSource.getRepository(ChartOfAccounts);
  private accountRepository = AppDataSource.getRepository(Account);

  /**
   * Create a new chart of accounts
   * @param name Name of the chart of accounts
   * @param description Description of the chart of accounts
   * @param code Code for the chart of accounts
   */
  async createChartOfAccounts(name: string, description: string, code: string): Promise<ChartOfAccounts> {
    const chartOfAccounts = new ChartOfAccounts();
    chartOfAccounts.name = name;
    chartOfAccounts.description = description;
    chartOfAccounts.code = code;
    chartOfAccounts.isActive = true;

    return await this.chartOfAccountsRepository.save(chartOfAccounts);
  }

  /**
   * Get all charts of accounts
   */
  async getAllChartsOfAccounts(): Promise<ChartOfAccounts[]> {
    return await this.chartOfAccountsRepository.find({
      where: { isActive: true },
      relations: ['accounts']
    });
  }

  /**
   * Get a chart of accounts by ID
   * @param id Chart of accounts ID
   */
  async getChartOfAccountsById(id: number): Promise<ChartOfAccounts | null> {
    return await this.chartOfAccountsRepository.findOne({
      where: { id, isActive: true },
      relations: ['accounts']
    });
  }

  /**
   * Create a new account
   * @param chartOfAccountsId Chart of accounts ID
   * @param name Account name
   * @param description Account description
   * @param code Account code
   * @param accountType Account type
   */
  async createAccount(
    chartOfAccountsId: number,
    name: string,
    description: string,
    code: string,
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  ): Promise<Account> {
    const chartOfAccounts = await this.chartOfAccountsRepository.findOneBy({ id: chartOfAccountsId });
    if (!chartOfAccounts) {
      throw new Error('Chart of accounts not found');
    }

    const account = new Account();
    account.name = name;
    account.description = description;
    account.code = code;
    account.accountType = accountType;
    account.status = 'ACTIVE';
    account.balance = 0;
    account.chartOfAccounts = chartOfAccounts;

    return await this.accountRepository.save(account);
  }

  /**
   * Get all accounts for a chart of accounts
   * @param chartOfAccountsId Chart of accounts ID
   */
  async getAccountsByChart(chartOfAccountsId: number): Promise<Account[]> {
    return await this.accountRepository.find({
      where: {
        chartOfAccounts: { id: chartOfAccountsId }
      },
      order: {
        code: 'ASC'
      }
    });
  }
}