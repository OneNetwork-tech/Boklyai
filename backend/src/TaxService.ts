import { AppDataSource } from './database';
import { TaxReport } from './TaxReport';
import { TaxRule } from './TaxRule';
import { Company } from './Company';
import { Invoice } from './Invoice';
import { Bill } from './Bill';
import { TaxRate } from './TaxRate';
import { Between, In } from 'typeorm';

export class TaxService {
  private taxReportRepository = AppDataSource.getRepository(TaxReport);
  private taxRuleRepository = AppDataSource.getRepository(TaxRule);
  private taxRateRepository = AppDataSource.getRepository(TaxRate);
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private billRepository = AppDataSource.getRepository(Bill);

  /**
   * Create a new tax report
   * @param companyId Company ID
   * @param name Report name
   * @param periodStart Period start date
   * @param periodEnd Period end date
   * @param taxType Tax type
   */
  async createTaxReport(
    companyId: number,
    name: string,
    startDate: Date,
    endDate: Date,
    taxType: string
  ): Promise<TaxReport> {
    const taxReport = new TaxReport();
    
    // Use relation object instead of direct ID
    taxReport.company = { id: companyId } as Company;
    
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
  async getTaxReportsByCompany(companyId: number): Promise<TaxReport[]> {
    return await this.taxReportRepository.find({
      where: { company: { id: companyId } },
      order: { startDate: 'DESC' }
    });
  }

  /**
   * Generate tax report data
   * @param taxReportId Tax report ID
   */
  async generateTaxReport(taxReportId: number): Promise<TaxReport> {
    const taxReport = await this.taxReportRepository.findOne({
      where: { id: taxReportId },
      relations: ['company']
    });

    if (!taxReport) {
      throw new Error('Tax report not found');
    }

    // Simplified tax calculation
    const { startDate, endDate, company } = taxReport;

    const invoiceData = await this.invoiceRepository.find({
      where: {
        company: { id: company.id },
        invoiceDate: Between(startDate, endDate),
        status: In(['SENT', 'PAID'])
      },
      relations: ['items']
    });

    const billData = await this.billRepository.find({
      where: {
        company: { id: company.id },
        billDate: Between(startDate, endDate),
        status: In(['SENT', 'PAID'])
      },
      relations: ['items']
    });

    const vatBuckets = {
      sales25: 0,
      sales12: 0,
      sales6: 0,
      purchase25: 0,
      purchase12: 0,
      purchase6: 0,
      exportSales: 0,
      reverseChargeSales: 0
    };

    let outputVat = 0;
    let inputVat = 0;

    for (const invoice of invoiceData) {
      for (const item of invoice.items) {
        const baseAmount = Number(item.totalAmount) - Number(item.taxAmount || 0);
        const vatAmount = Number(item.taxAmount || 0);
        const rate = Number(item.taxRate || 0);

        if (rate >= 24) {
          vatBuckets.sales25 += baseAmount;
        } else if (rate >= 11) {
          vatBuckets.sales12 += baseAmount;
        } else if (rate > 0) {
          vatBuckets.sales6 += baseAmount;
        } else {
          vatBuckets.exportSales += baseAmount;
        }

        outputVat += vatAmount;
      }
    }

    for (const bill of billData) {
      for (const item of bill.items) {
        const baseAmount = Number(item.totalAmount) - Number(item.taxAmount || 0);
        const vatAmount = Number(item.taxAmount || 0);
        const rate = Number(item.taxRate || 0);

        if (rate >= 24) {
          vatBuckets.purchase25 += baseAmount;
        } else if (rate >= 11) {
          vatBuckets.purchase12 += baseAmount;
        } else if (rate > 0) {
          vatBuckets.purchase6 += baseAmount;
        } else {
          vatBuckets.reverseChargeSales += baseAmount;
        }

        inputVat += vatAmount;
      }
    }

    const totalSales =
      vatBuckets.sales25 +
      vatBuckets.sales12 +
      vatBuckets.sales6 +
      vatBuckets.exportSales +
      vatBuckets.reverseChargeSales;
    const totalPurchases =
      vatBuckets.purchase25 + vatBuckets.purchase12 + vatBuckets.purchase6;
    const vatToPay = Number((outputVat - inputVat).toFixed(2));

    const skatteverketPayload = {
      reportingPeriod: {
        start: startDate,
        end: endDate
      },
      boxes: {
        box05: vatBuckets.sales25,
        box06: vatBuckets.sales12,
        box07: vatBuckets.sales6,
        box08: vatBuckets.exportSales,
        box10: vatBuckets.purchase25,
        box11: vatBuckets.purchase12,
        box12: vatBuckets.purchase6,
        box30: outputVat,
        box48: inputVat,
        box49: outputVat - inputVat,
        box50: vatToPay
      }
    };

    taxReport.reportData = skatteverketPayload;
    taxReport.totalSales = Number(totalSales.toFixed(2));
    taxReport.totalPurchases = Number(totalPurchases.toFixed(2));
    taxReport.vatToPay = vatToPay;
    taxReport.status = 'APPROVED';

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
  async createTaxRule(
    accountId: number,
    name: string,
    description: string,
    rate?: number,
    appliesTo?: string
  ): Promise<TaxRule> {
    const taxRule = new TaxRule();
    taxRule.accountId = accountId;
    taxRule.name = name;
    taxRule.description = description;
    taxRule.validFrom = new Date();
    taxRule.validTo = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // 1 year from now
    taxRule.isActive = true;
    taxRule.appliesTo = appliesTo;

    if (rate !== undefined) {
      let taxRate = await this.taxRateRepository.findOne({
        where: { rate, status: 'ACTIVE' }
      });

      if (!taxRate) {
        taxRate = this.taxRateRepository.create({
          name: `${Math.round(rate * 100)}% VAT`,
          rate,
          status: 'ACTIVE',
          description: 'Automatically generated rate from TaxService',
          isDefault: false
        });

        taxRate = await this.taxRateRepository.save(taxRate);
      }

      taxRule.taxRateId = taxRate.id;
      taxRule.taxRate = taxRate;
    }

    if (!taxRule.taxRateId) {
      let defaultRate = await this.taxRateRepository.findOne({
        where: { isDefault: true, status: 'ACTIVE' }
      });

      if (!defaultRate) {
        defaultRate = await this.taxRateRepository.save(
          this.taxRateRepository.create({
            name: 'Standard VAT 25%',
            rate: 0.25,
            description: 'Default Swedish VAT rate',
            status: 'ACTIVE',
            isDefault: true
          })
        );
      }

      taxRule.taxRateId = defaultRate.id;
      taxRule.taxRate = defaultRate;
    }

    return await this.taxRuleRepository.save(taxRule);
  }

  /**
   * Get tax rules by company
   * @param companyId Company ID
   */
  async getTaxRulesByCompany(companyId: number): Promise<TaxRule[]> {
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
  async calculateTax(companyId: number, amount: number, taxType: string): Promise<number> {
    const taxRates = await this.taxRuleRepository.find({
      where: {
        isActive: true,
        appliesTo: taxType
      },
      relations: ['taxRate']
    });

    if (taxRates.length === 0) {
      // Default Swedish VAT rate
      const defaultRate = taxType === 'REDUCED_VAT_12' ? 0.12 : taxType === 'REDUCED_VAT_6' ? 0.06 : 0.25;
      return Number((amount * defaultRate).toFixed(2));
    }

    const rate = taxRates[0].taxRate?.rate ?? 0.25;
    return Number((amount * rate).toFixed(2));
  }

  /**
   * Submit tax report to authorities
   * @param reportId Report ID
   */
  async submitTaxReport(reportId: number): Promise<TaxReport> {
    const taxReport = await this.taxReportRepository.findOneBy({ id: reportId });
    if (!taxReport) {
      throw new Error('Tax report not found');
    }

    taxReport.status = 'SUBMITTED';
    taxReport.reportData = {
      ...taxReport.reportData,
      submissionTimestamp: new Date().toISOString(),
      submittedTo: 'Skatteverket'
    };

    return await this.taxReportRepository.save(taxReport);
  }

  /**
   * Get tax report status
   * @param reportId Report ID
   */
  async getTaxReportStatus(reportId: number): Promise<string> {
    const taxReport = await this.taxReportRepository.findOneBy({ id: reportId });
    if (!taxReport) {
      throw new Error('Tax report not found');
    }

    return taxReport.status;
  }
}