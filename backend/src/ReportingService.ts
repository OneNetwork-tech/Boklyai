
import { AppDataSource } from './database';
import { FinancialReport } from './FinancialReport';
import { Dashboard } from './Dashboard';
import { Kpi } from './Kpi';
import { Company } from './Company';
import { Account } from './Account';
import { Transaction } from './Transaction';

export class ReportingService {
  private financialReportRepository = AppDataSource.getRepository(FinancialReport);
  private dashboardRepository = AppDataSource.getRepository(Dashboard);
  private kpiRepository = AppDataSource.getRepository(Kpi);
  private companyRepository = AppDataSource.getRepository(Company);
  private accountRepository = AppDataSource.getRepository(Account);
  private transactionRepository = AppDataSource.getRepository(Transaction);

  /**
   * Create a new financial report
   * @param companyId Company ID
   * @param name Report name
   * @param type Report type
   * @param startDate Start date
   * @param endDate End date
   * @param description Report description
   */
  async createFinancialReport(
    companyId: number,
    name: string,
    type: string,
    startDate: Date,
    endDate: Date,
    description?: string,
    isPublic?: boolean
  ): Promise<FinancialReport> {
    const financialReport = new FinancialReport();
    financialReport.company = { id: companyId } as Company;
    financialReport.name = name;
    financialReport.description = description || '';
    financialReport.startDate = startDate;
    financialReport.endDate = endDate;
    financialReport.type = type as 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'CUSTOM';
    financialReport.status = 'DRAFT';
    financialReport.isPublic = isPublic || false;

    return await this.financialReportRepository.save(financialReport);
  }

  /**
   * Get all financial reports for a company
   * @param companyId Company ID
   */
  async getFinancialReportsByCompany(companyId: number): Promise<FinancialReport[]> {
    return await this.financialReportRepository.find({
      where: { company: { id: companyId } },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get financial report by ID
   * @param id Report ID
   */
  async getFinancialReportById(id: number): Promise<FinancialReport | null> {
    return await this.financialReportRepository.findOne({
      where: { id },
      relations: ['company']
    });
  }

  /**
   * Generate financial report data
   * @param reportId Report ID
   */
  async generateFinancialReportData(reportId: number): Promise<FinancialReport> {
    const financialReport = await this.financialReportRepository.findOneBy({ id: reportId });
    if (!financialReport) {
      throw new Error('Financial report not found');
    }

    // In a real implementation, this would generate actual financial report data
    // For now, we'll just update the status and add mock data
    const balanceSheetData = await this.generateBalanceSheet(financialReport);
    const incomeStatementData = await this.generateIncomeStatement(financialReport);
    const cashFlowData = await this.generateCashFlowStatement(financialReport);

    financialReport.status = 'FINAL';
    financialReport.reportData = {
      balanceSheet: balanceSheetData,
      incomeStatement: incomeStatementData,
      cashFlow: cashFlowData
    };

    return await this.financialReportRepository.save(financialReport);
  }

  /**
   * Generate balance sheet data
   * @param report Financial report
   */
  private async generateBalanceSheet(report: FinancialReport): Promise<any> {
    // Get all accounts for the company
    const accounts = await this.accountRepository.find({
      where: {
        chartOfAccounts: {
          id: report.company.id
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
  private async generateIncomeStatement(report: FinancialReport): Promise<any> {
    // Get revenue and expense accounts
    const revenueAccounts = await this.accountRepository.find({
      where: {
        chartOfAccounts: {
          id: report.company.id
        },
        accountType: 'REVENUE'
      },
      relations: ['chartOfAccounts']
    });
    const expenseAccounts = await this.accountRepository.find({
      where: {
        chartOfAccounts: {
          id: report.company.id
        },
        accountType: 'EXPENSE'
      },
      relations: ['chartOfAccounts']
    });

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
  private async generateCashFlowStatement(report: FinancialReport): Promise<any> {
    // Get all transactions within the report period
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .where('transaction.createdAt >= :startDate', { startDate: report.startDate })
      .andWhere('transaction.createdAt <= :endDate', { endDate: report.endDate })
      .andWhere('account.chartOfAccounts.companyId = :companyId', { companyId: report.company.id })
      .getMany();

    // Separate cash flows by type
    const operatingActivities: Transaction[] = [];
    const investingActivities: Transaction[] = [];
    const financingActivities: Transaction[] = [];

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
  async createDashboard(
    companyId: number,
    name: string,
    description?: string,
    layout?: any,
    kpiConfig?: any
  ): Promise<Dashboard> {
    const dashboard = new Dashboard();
    dashboard.company = { id: companyId } as Company;
    dashboard.name = name;
    dashboard.description = description || '';
    dashboard.layout = layout || {};
    dashboard.kpiConfig = kpiConfig || {};
    dashboard.isActive = true;

    return await this.dashboardRepository.save(dashboard);
  }

  /**
   * Get all dashboards for a company
   * @param companyId Company ID
   */
  async getDashboardsByCompany(companyId: number): Promise<Dashboard[]> {
    return await this.dashboardRepository.find({
      where: { company: { id: companyId }, isActive: true }
    });
  }

  /**
   * Get active dashboards for a company
   * @param companyId Company ID
   */
  async getActiveDashboardsByCompany(companyId: number): Promise<Dashboard[]> {
    return await this.dashboardRepository.find({
      where: { company: { id: companyId }, isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get dashboard by ID
   * @param id Dashboard ID
   */
  async getDashboardById(id: number): Promise<Dashboard | null> {
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
  async updateDashboardLayout(dashboardId: number, layout: any): Promise<Dashboard> {
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
  async updateDashboardKpiConfig(dashboardId: number, kpiConfig: any): Promise<Dashboard> {
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
  async createKpi(
    companyId: number,
    name: string,
    code: string,
    description?: string,
    unit?: string,
    category?: string,
    calculationParams?: any
  ): Promise<Kpi> {
    const kpi = new Kpi();
    kpi.company = { id: companyId } as Company;
    kpi.name = name;
    kpi.code = code;
    kpi.description = description || '';
    kpi.unit = unit || '';
    kpi.category = category || '';
    kpi.calculationParams = calculationParams || {};
    kpi.isActive = true;

    return await this.kpiRepository.save(kpi);
  }

  /**
   * Get all KPIs for a company
   * @param companyId Company ID
   */
  async getKpisByCompany(companyId: number): Promise<Kpi[]> {
    return await this.kpiRepository.find({
      where: { company: { id: companyId }, isActive: true }
    });
  }

  /**
   * Get active KPIs for a company
   * @param companyId Company ID
   */
  async getActiveKpisByCompany(companyId: number): Promise<Kpi[]> {
    return await this.kpiRepository.find({
      where: { company: { id: companyId }, isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get KPI by ID
   * @param id KPI ID
   */
  async getKpiById(id: number): Promise<Kpi | null> {
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
  async updateKpiValues(
    kpiId: number,
    currentValue: number,
    previousValue?: number,
    targetValue?: number
  ): Promise<Kpi> {
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
  async calculateSwedishBusinessKpis(companyId: number): Promise<any> {
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