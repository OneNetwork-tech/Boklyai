import { Company } from './Company';
import { TaxRule } from './TaxRule';
export declare class TaxReport {
    id: number;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    dueDate: Date;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    totalSales: number;
    totalPurchases: number;
    vatToPay: number;
    reportData: any;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    taxRule: TaxRule;
}
//# sourceMappingURL=TaxReport.d.ts.map