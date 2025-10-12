import { Company } from './Company';
import { PayrollItem } from './PayrollItem';
export declare class Payroll {
    id: number;
    name: string;
    periodStart: Date;
    periodEnd: Date;
    paymentDate: Date;
    status: 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'CANCELLED';
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetSalary: number;
    payrollData: any;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    items: PayrollItem[];
}
//# sourceMappingURL=Payroll.d.ts.map