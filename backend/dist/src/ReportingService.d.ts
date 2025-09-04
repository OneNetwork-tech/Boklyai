import { FinancialReport } from './FinancialReport';
import { Dashboard } from './Dashboard';
import { Kpi } from './Kpi';
import type { Date } from 'typeorm';
export declare class ReportingService {
    private financialReportRepository;
    private dashboardRepository;
    private kpiRepository;
    private companyRepository;
    private accountRepository;
    private transactionRepository;
    /**
     * Create a new financial report
     * @param companyId Company ID
     * @param name Report name
     * @param type Report type
     * @param startDate Start date
     * @param endDate End date
     * @param description Report description
     */
    createFinancialReport(companyId: number, name: string, type: string, startDate: Date, endDate: Date, description?: string): Promise<FinancialReport>;
    /**
     * Get all financial reports for a company
     * @param companyId Company ID
     */
    getFinancialReportsByCompany(companyId: number): Promise<FinancialReport[]>;
    /**
     * Get financial report by ID
     * @param id Report ID
     */
    getFinancialReportById(id: number): Promise<FinancialReport | null>;
    /**
     * Generate financial report data
     * @param reportId Report ID
     */
    generateFinancialReportData(reportId: number): Promise<FinancialReport>;
    /**
     * Generate balance sheet data
     * @param report Financial report
     */
    private generateBalanceSheet;
    /**
     * Generate income statement data
     * @param report Financial report
     */
    private generateIncomeStatement;
    /**
     * Generate cash flow statement data
     * @param report Financial report
     */
    private generateCashFlowStatement;
    /**
     * Create a new dashboard
     * @param companyId Company ID
     * @param name Dashboard name
     * @param description Dashboard description
     */
    createDashboard(companyId: number, name: string, description?: string): Promise<Dashboard>;
    /**
     * Get all dashboards for a company
     * @param companyId Company ID
     */
    getDashboardsByCompany(companyId: number): Promise<Dashboard[]>;
    /**
     * Get dashboard by ID
     * @param id Dashboard ID
     */
    getDashboardById(id: number): Promise<Dashboard | null>;
    /**
     * Update dashboard layout
     * @param dashboardId Dashboard ID
     * @param layout Dashboard layout configuration
     */
    updateDashboardLayout(dashboardId: number, layout: any): Promise<Dashboard>;
    /**
     * Update dashboard KPI configuration
     * @param dashboardId Dashboard ID
     * @param kpiConfig KPI configuration
     */
    updateDashboardKpiConfig(dashboardId: number, kpiConfig: any): Promise<Dashboard>;
    /**
     * Create a new KPI
     * @param companyId Company ID
     * @param name KPI name
     * @param code KPI code
     * @param description KPI description
     * @param unit KPI unit
     * @param category KPI category
     */
    createKpi(companyId: number, name: string, code: string, description?: string, unit?: string, category?: string): Promise<Kpi>;
    /**
     * Get all KPIs for a company
     * @param companyId Company ID
     */
    getKpisByCompany(companyId: number): Promise<Kpi[]>;
    /**
     * Get KPI by ID
     * @param id KPI ID
     */
    getKpiById(id: number): Promise<Kpi | null>;
    /**
     * Update KPI values
     * @param kpiId KPI ID
     * @param currentValue Current value
     * @param previousValue Previous value
     * @param targetValue Target value
     */
    updateKpiValues(kpiId: number, currentValue: number, previousValue?: number, targetValue?: number): Promise<Kpi>;
    /**
     * Calculate common Swedish business KPIs
     * @param companyId Company ID
     */
    calculateSwedishBusinessKpis(companyId: number): Promise<any>;
}
//# sourceMappingURL=ReportingService.d.ts.map