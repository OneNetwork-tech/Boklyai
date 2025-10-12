import { Company } from './Company';
export declare class FinancialReport {
    id: number;
    name: string;
    description: string;
    type: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'CUSTOM';
    startDate: Date;
    endDate: Date;
    reportData: any;
    status: 'DRAFT' | 'FINAL' | 'ARCHIVED';
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
}
//# sourceMappingURL=FinancialReport.d.ts.map