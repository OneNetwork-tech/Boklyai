"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingService = void 0;
const database_1 = require("./database");
const FinancialReport_1 = require("./FinancialReport");
const Dashboard_1 = require("./Dashboard");
const Kpi_1 = require("./Kpi");
const Company_1 = require("./Company");
const Account_1 = require("./Account");
const Transaction_1 = require("./Transaction");
class ReportingService {
    constructor() {
        this.financialReportRepository = database_1.AppDataSource.getRepository(FinancialReport_1.FinancialReport);
        this.dashboardRepository = database_1.AppDataSource.getRepository(Dashboard_1.Dashboard);
        this.kpiRepository = database_1.AppDataSource.getRepository(Kpi_1.Kpi);
        this.companyRepository = database_1.AppDataSource.getRepository(Company_1.Company);
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
        this.transactionRepository = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
    }
    /**
     * Create a new financial report
     * @param companyId Company ID
     * @param name Report name
     * @param type Report type
     * @param startDate Start date
     * @param endDate End date
     * @param description Report description
     */
    async createFinancialReport(companyId, name, type, startDate, endDate, description) {
        const financialReport = new FinancialReport_1.FinancialReport();
        financialReport.companyId = companyId;
        financialReport.name = name;
        financialReport.type = type;
        financialReport.startDate = startDate;
        financialReport.endDate = endDate;
        financialReport.description = description || '';
        financialReport.status = 'DRAFT';
        return await this.financialReportRepository.save(financialReport);
    }
    /**
     * Get all financial reports for a company
     * @param companyId Company ID
     */
    async getFinancialReportsByCompany(companyId) {
        return await this.financialReportRepository.find({
            where: { companyId },
            order: { createdAt: 'DESC' }
        });
    }
    /**
     * Get financial report by ID
     * @param id Report ID
     */
    async getFinancialReportById(id) {
        return await this.financialReportRepository.findOne({
            where: { id },
            relations: ['company']
        });
    }
    /**
     * Generate financial report data
     * @param reportId Report ID
     */
    async generateFinancialReportData(reportId) {
        const financialReport = await this.financialReportRepository.findOneBy({ id: reportId });
        if (!financialReport) {
            throw new Error('Financial report not found');
        }
        // In a real implementation, this would generate actual financial report data
        // For now, we'll just update the status and add mock data
        financialReport.status = 'GENERATED';
        financialReport.generatedAt = new Date();
        financialReport.data = {
            // Mock financial data
            revenue: 100000,
            expenses: 60000,
            profit: 40000
        };
        return await this.financialReportRepository.save(financialReport);
    }
    /**
     * Generate balance sheet data
     * @param report Financial report
     */
    async generateBalanceSheet(report) {
        // Get all accounts for the company
        const accounts = await this.accountRepository.find({
            where: {
                chartOfAccounts: {
                    company: {
                        id: report.company.id
                    }
                }
            },
            relations: ['chartOfAccounts']
        });
        // Separate accounts by type
        const assets = accounts.filter(account => account.accountType === 'ASSET');
        const liabilities = accounts.filter(account => account.accountType === 'LIABILITY');
        const equity = accounts.filter(account => account.accountType === 'EQUITY');
        // Calculate totals
        const totalAssets = assets.reduce((sum, account) => sum + account.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, account) => sum + account.balance, 0);
        const totalEquity = equity.reduce((sum, account) => sum + account.balance, 0);
        return {
            assets: assets.map(account => ({
                code: account.code,
                name: account.name,
                balance: account.balance
            })),
            liabilities: liabilities.map(account => ({
                code: account.code,
                name: account.name,
                balance: account.balance
            })),
            equity: equity.map(account => ({
                code: account.code,
                name: account.name,
                balance: account.balance
            })),
            totalAssets,
            totalLiabilities,
            totalEquity,
            balanceCheck: totalAssets - (totalLiabilities + totalEquity) // Should be 0
        };
    }
    /**
     * Generate income statement data
     * @param report Financial report
     */
    async generateIncomeStatement(report) {
        // Get revenue and expense accounts
        const accounts = await this.accountRepository.find({
            where: {
                chartOfAccounts: {
                    company: {
                        id: report.company.id
                    }
                },
                accountType: 'REVENUE' || 'EXPENSE'
            },
            relations: ['chartOfAccounts']
        });
        // Separate revenue and expenses
        const revenueAccounts = accounts.filter(account => account.accountType === 'REVENUE');
        const expenseAccounts = accounts.filter(account => account.accountType === 'EXPENSE');
        // Calculate totals
        const totalRevenue = revenueAccounts.reduce((sum, account) => sum + account.balance, 0);
        const totalExpenses = expenseAccounts.reduce((sum, account) => sum + account.balance, 0);
        const netIncome = totalRevenue - totalExpenses;
        return {
            revenue: revenueAccounts.map(account => ({
                code: account.code,
                name: account.name,
                balance: account.balance
            })),
            expenses: expenseAccounts.map(account => ({
                code: account.code,
                name: account.name,
                balance: account.balance
            })),
            totalRevenue,
            totalExpenses,
            netIncome
        };
    }
    /**
     * Generate cash flow statement data
     * @param report Financial report
     */
    async generateCashFlowStatement(report) {
        // Get all transactions within the report period
        const transactions = await this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.account', 'account')
            .where('transaction.createdAt >= :startDate', { startDate: report.startDate })
            .andWhere('transaction.createdAt <= :endDate', { endDate: report.endDate })
            .andWhere('account.chartOfAccounts.companyId = :companyId', { companyId: report.company.id })
            .getMany();
        // Separate cash flows by type
        const operatingActivities = [];
        const investingActivities = [];
        const financingActivities = [];
        // For simplicity, we'll categorize based on account codes
        // In a real implementation, this would be more sophisticated
        transactions.forEach(transaction => {
            const accountCode = transaction.account.code;
            // Operating activities (typically 3xxx, 4xxx, 5xxx, 6xxx, 7xxx accounts)
            if (accountCode.startsWith('3') || accountCode.startsWith('4') ||
                accountCode.startsWith('5') || accountCode.startsWith('6') ||
                accountCode.startsWith('7')) {
                operatingActivities.push(transaction);
            }
            // Investing activities (typically 1xxx, 2xxx accounts)
            else if (accountCode.startsWith('1') || accountCode.startsWith('2')) {
                investingActivities.push(transaction);
            }
            // Financing activities (typically 8xxx accounts)
            else if (accountCode.startsWith('8')) {
                financingActivities.push(transaction);
            }
        });
        // Calculate totals
        const totalOperating = operatingActivities.reduce((sum, t) => sum + t.amount, 0);
        const totalInvesting = investingActivities.reduce((sum, t) => sum + t.amount, 0);
        const totalFinancing = financingActivities.reduce((sum, t) => sum + t.amount, 0);
        const netChange = totalOperating + totalInvesting + totalFinancing;
        return {
            operatingActivities: operatingActivities.map(t => ({
                date: t.createdAt,
                description: t.description,
                amount: t.amount,
                account: t.account.name
            })),
            investingActivities: investingActivities.map(t => ({
                date: t.createdAt,
                description: t.description,
                amount: t.amount,
                account: t.account.name
            })),
            financingActivities: financingActivities.map(t => ({
                date: t.createdAt,
                description: t.description,
                amount: t.amount,
                account: t.account.name
            })),
            totalOperating,
            totalInvesting,
            totalFinancing,
            netChange
        };
    }
    /**
     * Create a new dashboard
     * @param companyId Company ID
     * @param name Dashboard name
     * @param description Dashboard description
     */
    async createDashboard(companyId, name, description) {
        const dashboard = new Dashboard_1.Dashboard();
        dashboard.companyId = companyId;
        dashboard.name = name;
        dashboard.description = description || '';
        dashboard.isActive = true;
        return await this.dashboardRepository.save(dashboard);
    }
    /**
     * Get all dashboards for a company
     * @param companyId Company ID
     */
    async getDashboardsByCompany(companyId) {
        return await this.dashboardRepository.find({
            where: { companyId, isActive: true }
        });
    }
    /**
     * Get dashboard by ID
     * @param id Dashboard ID
     */
    async getDashboardById(id) {
        return await this.dashboardRepository.findOne({
            where: { id, isActive: true },
            relations: ['company']
        });
    }
    /**
     * Update dashboard layout
     * @param dashboardId Dashboard ID
     * @param layout Dashboard layout configuration
     */
    async updateDashboardLayout(dashboardId, layout) {
        const dashboard = await this.dashboardRepository.findOneBy({ id: dashboardId });
        if (!dashboard) {
            throw new Error('Dashboard not found');
        }
        dashboard.layout = layout;
        return await this.dashboardRepository.save(dashboard);
    }
    /**
     * Update dashboard KPI configuration
     * @param dashboardId Dashboard ID
     * @param kpiConfig KPI configuration
     */
    async updateDashboardKpiConfig(dashboardId, kpiConfig) {
        const dashboard = await this.dashboardRepository.findOneBy({ id: dashboardId });
        if (!dashboard) {
            throw new Error('Dashboard not found');
        }
        dashboard.kpiConfig = kpiConfig;
        return await this.dashboardRepository.save(dashboard);
    }
    /**
     * Create a new KPI
     * @param companyId Company ID
     * @param name KPI name
     * @param code KPI code
     * @param description KPI description
     * @param unit KPI unit
     * @param category KPI category
     */
    async createKpi(companyId, name, code, description, unit, category) {
        const kpi = new Kpi_1.Kpi();
        kpi.companyId = companyId;
        kpi.name = name;
        kpi.code = code;
        kpi.description = description || '';
        kpi.unit = unit || '';
        kpi.category = category || '';
        kpi.currentValue = 0;
        kpi.previousValue = 0;
        kpi.targetValue = 0;
        kpi.isActive = true;
        return await this.kpiRepository.save(kpi);
    }
    /**
     * Get all KPIs for a company
     * @param companyId Company ID
     */
    async getKpisByCompany(companyId) {
        return await this.kpiRepository.find({
            where: { companyId, isActive: true }
        });
    }
    /**
     * Get KPI by ID
     * @param id KPI ID
     */
    async getKpiById(id) {
        return await this.kpiRepository.findOne({
            where: { id, isActive: true },
            relations: ['company']
        });
    }
    /**
     * Update KPI values
     * @param kpiId KPI ID
     * @param currentValue Current value
     * @param previousValue Previous value
     * @param targetValue Target value
     */
    async updateKpiValues(kpiId, currentValue, previousValue, targetValue) {
        const kpi = await this.kpiRepository.findOneBy({ id: kpiId });
        if (!kpi) {
            throw new Error('KPI not found');
        }
        kpi.currentValue = currentValue;
        kpi.previousValue = previousValue !== undefined ? previousValue : kpi.previousValue;
        kpi.targetValue = targetValue !== undefined ? targetValue : kpi.targetValue;
        return await this.kpiRepository.save(kpi);
    }
    /**
     * Calculate common Swedish business KPIs
     * @param companyId Company ID
     */
    async calculateSwedishBusinessKpis(companyId) {
        // In a real implementation, this would calculate actual Swedish business KPIs
        // For now, we'll return mock data
        return {
            debtToEquityRatio: 0.5,
            currentRatio: 2.0,
            netProfitMargin: 0.15,
            returnOnEquity: 0.12,
            workingCapital: 50000
        };
    }
}
exports.ReportingService = ReportingService;
//# sourceMappingURL=ReportingService.js.map