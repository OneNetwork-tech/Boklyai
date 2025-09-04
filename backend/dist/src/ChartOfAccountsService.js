"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccountsService = void 0;
const database_1 = require("./database");
const ChartOfAccounts_1 = require("./ChartOfAccounts");
const Account_1 = require("./Account");
class ChartOfAccountsService {
    constructor() {
        this.chartOfAccountsRepository = database_1.AppDataSource.getRepository(ChartOfAccounts_1.ChartOfAccounts);
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
    }
    /**
     * Create a new chart of accounts
     * @param name Name of the chart of accounts
     * @param description Description of the chart of accounts
     * @param code Code for the chart of accounts
     */
    async createChartOfAccounts(name, description, code) {
        const chartOfAccounts = new ChartOfAccounts_1.ChartOfAccounts();
        chartOfAccounts.name = name;
        chartOfAccounts.description = description;
        chartOfAccounts.code = code;
        chartOfAccounts.isActive = true;
        return await this.chartOfAccountsRepository.save(chartOfAccounts);
    }
    /**
     * Get all charts of accounts
     */
    async getAllChartsOfAccounts() {
        return await this.chartOfAccountsRepository.find({
            where: { isActive: true },
            relations: ['accounts']
        });
    }
    /**
     * Get a chart of accounts by ID
     * @param id Chart of accounts ID
     */
    async getChartOfAccountsById(id) {
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
    async createAccount(chartOfAccountsId, name, description, code, accountType) {
        const chartOfAccounts = await this.chartOfAccountsRepository.findOneBy({ id: chartOfAccountsId });
        if (!chartOfAccounts) {
            throw new Error('Chart of accounts not found');
        }
        const account = new Account_1.Account();
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
    async getAccountsByChart(chartOfAccountsId) {
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
exports.ChartOfAccountsService = ChartOfAccountsService;
//# sourceMappingURL=ChartOfAccountsService.js.map