"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxService = void 0;
const database_1 = require("./database");
const TaxReport_1 = require("./TaxReport");
const TaxRule_1 = require("./TaxRule");
const Transaction_1 = require("./Transaction");
class TaxService {
    constructor() {
        this.taxReportRepository = database_1.AppDataSource.getRepository(TaxReport_1.TaxReport);
        this.taxRuleRepository = database_1.AppDataSource.getRepository(TaxRule_1.TaxRule);
        this.transactionRepository = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
    }
    /**
     * Create a new tax report
     * @param companyId Company ID
     * @param name Report name
     * @param periodStart Period start date
     * @param periodEnd Period end date
     * @param taxType Tax type
     */
    async createTaxReport(companyId, name, periodStart, periodEnd, taxType) {
        const taxReport = new TaxReport_1.TaxReport();
        // Use relation object instead of direct ID
        taxReport.company = { id: companyId };
        taxReport.name = name;
        taxReport.periodStart = periodStart;
        taxReport.periodEnd = periodEnd;
        taxReport.taxType = taxType;
        taxReport.status = 'DRAFT';
        return await this.taxReportRepository.save(taxReport);
    }
    /**
     * Get tax reports by company
     * @param companyId Company ID
     */
    async getTaxReportsByCompany(companyId) {
        return await this.taxReportRepository.find({
            where: { company: { id: companyId } },
            order: { periodStart: 'DESC' }
        });
    }
    /**
     * Generate tax report data
     * @param reportId Report ID
     */
    async generateTaxReport(reportId) {
        const taxReport = await this.taxReportRepository.findOne({
            where: { id: reportId },
            relations: ['company']
        });
        if (!taxReport) {
            throw new Error('Tax report not found');
        }
        // Calculate tax data based on transactions
        const taxData = await this.calculateTaxData(taxReport.company.id, taxReport.periodStart, taxReport.periodEnd, taxReport.taxType);
        // Update report status and data
        taxReport.status = 'SUBMITTED';
        taxReport.data = taxData;
        return await this.taxReportRepository.save(taxReport);
    }
    /**
     * Calculate tax data
     * @param companyId Company ID
     * @param periodStart Period start date
     * @param periodEnd Period end date
     * @param taxType Tax type
     */
    async calculateTaxData(companyId, periodStart, periodEnd, taxType) {
        // Mock implementation - in real scenario, this would calculate actual tax amounts
        const transactions = await this.transactionRepository.find({
            where: {
                account: { chartOfAccounts: { company: { id: companyId } } },
                transactionDate: { $between: [periodStart, periodEnd] }
            },
            relations: ['account']
        });
        // Apply tax rules based on tax type
        const taxableAmount = transactions.reduce((sum, transaction) => {
            // Simple mock calculation
            return sum + (transaction.amount > 0 ? transaction.amount : 0);
        }, 0);
        const taxRate = 0.25; // Mock tax rate
        const taxAmount = taxableAmount * taxRate;
        return {
            taxableAmount,
            taxRate,
            taxAmount,
            transactionsCount: transactions.length
        };
    }
    /**
     * Create a new tax rule
     * @param companyId Company ID
     * @param name Rule name
     * @param description Rule description
     * @param rate Tax rate
     * @param appliesTo What the rule applies to
     */
    async createTaxRule(companyId, name, description, rate, appliesTo) {
        const taxRule = new TaxRule_1.TaxRule();
        // Use relation object instead of direct ID
        taxRule.company = { id: companyId };
        taxRule.name = name;
        taxRule.description = description || '';
        taxRule.rate = rate || 0;
        taxRule.appliesTo = appliesTo || '';
        taxRule.isActive = true;
        return await this.taxRuleRepository.save(taxRule);
    }
    /**
     * Get tax rules by company
     * @param companyId Company ID
     */
    async getTaxRulesByCompany(companyId) {
        return await this.taxRuleRepository.find({
            where: { company: { id: companyId }, isActive: true }
        });
    }
    /**
     * Calculate tax for a specific amount
     * @param companyId Company ID
     * @param amount Amount to calculate tax for
     * @param taxType Tax type
     */
    async calculateTax(companyId, amount, taxType) {
        // Mock implementation - get tax rate from rules
        const taxRules = await this.getTaxRulesByCompany(companyId);
        const applicableRule = taxRules.find(rule => rule.appliesTo === taxType);
        const taxRate = applicableRule ? applicableRule.rate : 0.25; // Default 25%
        const tax = amount * taxRate;
        const total = amount + tax;
        return { amount, tax, total };
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
        taxReport.submittedAt = new Date();
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