import { AppDataSource } from './database';
import { Between } from 'typeorm';
import { AnnualReport } from './AnnualReport';
import { Company } from './Company';
import { Invoice } from './Invoice';
import { Bill } from './Bill';
import { Payroll } from './Payroll';

export class AnnualReportService {
  private annualReportRepository = AppDataSource.getRepository(AnnualReport);
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private billRepository = AppDataSource.getRepository(Bill);
  private payrollRepository = AppDataSource.getRepository(Payroll);

  async createDraft(companyId: number, fiscalYear: number): Promise<AnnualReport> {
    const companyReference = { id: companyId } as Company;
    const existingReport = await this.annualReportRepository.findOne({
      where: { company: { id: companyId }, fiscalYear }
    });

    if (existingReport) {
      return existingReport;
    }

    const report = this.annualReportRepository.create({
      company: companyReference,
      fiscalYear,
      balanceSheet: {},
      incomeStatement: {},
      cashFlowStatement: null,
      boardStatement: null,
      sustainabilityReport: null,
      status: 'DRAFT'
    });

    return await this.annualReportRepository.save(report);
  }

  async generateAnnualStatements(companyId: number, fiscalYear: number): Promise<AnnualReport> {
    const report = await this.createDraft(companyId, fiscalYear);

    const yearStart = new Date(fiscalYear, 0, 1);
    const yearEnd = new Date(fiscalYear, 11, 31);

    const [invoices, bills, payrolls] = await Promise.all([
      this.invoiceRepository.find({
        where: {
          company: { id: companyId },
          invoiceDate: Between(yearStart, yearEnd),
          status: 'PAID'
        }
      }),
      this.billRepository.find({
        where: {
          company: { id: companyId },
          billDate: Between(yearStart, yearEnd),
          status: 'PAID'
        }
      }),
      this.payrollRepository.find({
        where: { company: { id: companyId }, status: 'PROCESSED' }
      })
    ]);

    const revenue = invoices.reduce((acc, invoice) => acc + Number(invoice.totalAmount || 0), 0);
    const cogs = bills.reduce((acc, bill) => acc + Number(bill.totalAmount || 0), 0);
    const payrollCosts = payrolls.reduce((acc, payroll) => acc + Number(payroll.totalGrossSalary || 0), 0);

    report.incomeStatement = {
      revenue,
      costOfGoodsSold: cogs,
      grossProfit: Number((revenue - cogs).toFixed(2)),
      payrollCosts,
      operatingProfit: Number((revenue - cogs - payrollCosts).toFixed(2))
    };

    report.balanceSheet = {
      assets: {
        cashAndEquivalents: Number((revenue - cogs - payrollCosts).toFixed(2)),
        accountsReceivable: invoices.length,
        inventory: bills.length * 1000
      },
      equityAndLiabilities: {
        equity: Number((revenue - cogs - payrollCosts).toFixed(2)),
        accountsPayable: bills.length * 500,
        accruedExpenses: payrollCosts * 0.25
      }
    };

    report.cashFlowStatement = {
      operatingActivities: revenue - cogs - payrollCosts,
      investingActivities: -bills.length * 2000,
      financingActivities: 0,
      netCashFlow: revenue - cogs - payrollCosts - bills.length * 2000
    };

    report.boardStatement = {
      signedAt: new Date().toISOString(),
      directors: ['VD', 'Styrelseledamot'],
      statement: 'Styrelsen intygar att årsredovisningen ger en rättvisande bild.'
    };

    report.sustainabilityReport = {
      included: true,
      environmentalImpact: 'Reduced CO2e via digital receipts',
      socialImpact: 'Supports föreningar with transparency tools'
    };

    report.status = 'APPROVED';

    return await this.annualReportRepository.save(report);
  }

  async submitAnnualReport(reportId: number, signature: string): Promise<AnnualReport> {
    const report = await this.annualReportRepository.findOneBy({ id: reportId });
    if (!report) {
      throw new Error('Annual report not found');
    }

    report.status = 'SUBMITTED';
    report.signature = signature;
    report.submittedAt = new Date();

    return await this.annualReportRepository.save(report);
  }

  async listReports(companyId: number): Promise<AnnualReport[]> {
    return await this.annualReportRepository.find({
      where: { company: { id: companyId } },
      order: { fiscalYear: 'DESC' }
    });
  }
}
