import { TaxReport } from './TaxReport';
import { TaxRule } from './TaxRule';
export declare class TaxService {
    private taxReportRepository;
    private taxRuleRepository;
    /**
     * Create a new tax report
     * @param companyId Company ID
     * @param name Report name
     * @param periodStart Period start date
     * @param periodEnd Period end date
     * @param taxType Tax type
     */
    createTaxReport(companyId: number, name: string, startDate: Date, endDate: Date, taxType: string): Promise<TaxReport>;
    /**
     * Get tax reports by company
     * @param companyId Company ID
     */
    getTaxReportsByCompany(companyId: number): Promise<TaxReport[]>;
    /**
     * Generate tax report data
     * @param taxReportId Tax report ID
     */
    generateTaxReport(taxReportId: number): Promise<TaxReport>;
    /**
     * Create a new tax rule
     * @param companyId Company ID
     * @param name Rule name
     * @param description Rule description
     * @param rate Tax rate
     * @param appliesTo What the rule applies to
     */
    createTaxRule(accountId: number, name: string, description: string, rate?: number, appliesTo?: string): Promise<TaxRule>;
    /**
     * Get tax rules by company
     * @param companyId Company ID
     */
    getTaxRulesByCompany(companyId: number): Promise<TaxRule[]>;
    /**
     * Calculate tax for an amount
     * @param companyId Company ID
     * @param amount Amount to calculate tax for
     * @param taxType Tax type
     */
    calculateTax(companyId: number, amount: number, taxType: string): Promise<number>;
    /**
     * Submit tax report to authorities
     * @param reportId Report ID
     */
    submitTaxReport(reportId: number): Promise<TaxReport>;
    /**
     * Get tax report status
     * @param reportId Report ID
     */
    getTaxReportStatus(reportId: number): Promise<string>;
}
//# sourceMappingURL=TaxService.d.ts.map