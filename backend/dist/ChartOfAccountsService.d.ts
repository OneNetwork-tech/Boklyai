import { ChartOfAccounts } from './ChartOfAccounts';
import { Account } from './Account';
export declare class ChartOfAccountsService {
    private chartOfAccountsRepository;
    private accountRepository;
    /**
     * Create a new chart of accounts
     * @param name Name of the chart of accounts
     * @param description Description of the chart of accounts
     * @param code Code for the chart of accounts
     */
    createChartOfAccounts(name: string, description: string, code: string): Promise<ChartOfAccounts>;
    /**
     * Get all charts of accounts
     */
    getAllChartsOfAccounts(): Promise<ChartOfAccounts[]>;
    /**
     * Get a chart of accounts by ID
     * @param id Chart of accounts ID
     */
    getChartOfAccountsById(id: number): Promise<ChartOfAccounts | null>;
    /**
     * Create a new account
     * @param chartOfAccountsId Chart of accounts ID
     * @param name Account name
     * @param description Account description
     * @param code Account code
     * @param accountType Account type
     */
    createAccount(chartOfAccountsId: number, name: string, description: string, code: string, accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'): Promise<Account>;
    /**
     * Get all accounts for a chart of accounts
     * @param chartOfAccountsId Chart of accounts ID
     */
    getAccountsByChart(chartOfAccountsId: number): Promise<Account[]>;
}
//# sourceMappingURL=ChartOfAccountsService.d.ts.map