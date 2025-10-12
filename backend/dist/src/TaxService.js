"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxService = void 0;
const database_1 = require("./database");
const TaxReport_1 = require("./TaxReport");
const TaxRule_1 = require("./TaxRule");
class TaxService {
    constructor() {
        this.taxReportRepository = database_1.AppDataSource.getRepository(TaxReport_1.TaxReport);
        this.taxRuleRepository = database_1.AppDataSource.getRepository(TaxRule_1.TaxRule);
    }
    /**
     * Create a new tax report
     * @param companyId Company ID
     * @param name Report name
     * @param periodStart Period start date
     * @param periodEnd Period end date
     * @param taxType Tax type
     */
    async createTaxReport(companyId, name, startDate, endDate, taxType) {
        const taxReport = new TaxReport_1.TaxReport();
        // Use relation object instead of direct ID
        taxReport.company = { id: companyId };
        taxReport.name = name;
        taxReport.startDate = startDate;
        taxReport.endDate = endDate;
        taxReport.dueDate = new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after end date
        taxReport.status = 'DRAFT';
        taxReport.totalSales = 0;
        taxReport.totalPurchases = 0;
        taxReport.vatToPay = 0;
        return await this.taxReportRepository.save(taxReport);
    }
    /**
     * Get tax reports by company
     * @param companyId Company ID
     */
    async getTaxReportsByCompany(companyId) {
        return await this.taxReportRepository.find({
            where: { company: { id: companyId } },
            order: { startDate: 'DESC' }
        });
    }
    /**
     * Generate tax report data
     * @param taxReportId Tax report ID
     */
    async generateTaxReport(taxReportId) {
        const taxReport = await this.taxReportRepository.findOne({
            where: { id: taxReportId },
            relations: ['company']
        });
        if (!taxReport) {
            throw new Error('Tax report not found');
        }
        // Simplified tax calculation
        const taxData = {
            totalSales: 1000,
            totalPurchases: 500,
            vatToPay: 125, // (1000 - 500) * 0.25
            startDate: taxReport.startDate,
            endDate: taxReport.endDate
        };
        taxReport.reportData = taxData;
        taxReport.totalSales = taxData.totalSales;
        taxReport.totalPurchases = taxData.totalPurchases;
        taxReport.vatToPay = taxData.vatToPay;
        taxReport.status = 'SUBMITTED';
        return await this.taxReportRepository.save(taxReport);
    }
    /**
     * Create a new tax rule
     * @param companyId Company ID
     * @param name Rule name
     * @param description Rule description
     * @param rate Tax rate
     * @param appliesTo What the rule applies to
     */
    async createTaxRule(accountId, name, description, rate, appliesTo) {
        const taxRule = new TaxRule_1.TaxRule();
        taxRule.accountId = accountId;
        taxRule.name = name;
        taxRule.description = description;
        taxRule.validFrom = new Date();
        taxRule.validTo = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // 1 year from now
        taxRule.isActive = true;
        return await this.taxRuleRepository.save(taxRule);
    }
    /**
     * Get tax rules by company
     * @param companyId Company ID
     */
    async getTaxRulesByCompany(companyId) {
        return await this.taxRuleRepository.find({
            where: { isActive: true },
            relations: ['account', 'taxRate']
        });
    }
    /**
     * Calculate tax for an amount
     * @param companyId Company ID
     * @param amount Amount to calculate tax for
     * @param taxType Tax type
     */
    async calculateTax(companyId, amount, taxType) {
        // Simplified tax calculation with default 25% rate
        return amount * 0.25;
    }
    /**
     * Submit tax report to authorities
     * @param reportId Report ID
     */
    async submitTaxReport(reportId) {
        const taxReport = await this.taxReportRepository.findOneBy({ id: reportId });
        if (!taxReport) {
            throw new Error('Tax report not found');
        }
        taxReport.status = 'SUBMITTED';
        return await this.taxReportRepository.save(taxReport);
    }
    /**
     * Get tax report status
     * @param reportId Report ID
     */
    async getTaxReportStatus(reportId) {
        const taxReport = await this.taxReportRepository.findOneBy({ id: reportId });
        if (!taxReport) {
            throw new Error('Tax report not found');
        }
        return taxReport.status;
    }
}
exports.TaxService = TaxService;
//# sourceMappingURL=TaxService.js.map