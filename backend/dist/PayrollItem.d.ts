import { Payroll } from './Payroll';
import { Employee } from './Employee';
export declare class PayrollItem {
    id: number;
    grossSalary: number;
    taxableIncome: number;
    preTaxDeductions: number;
    postTaxDeductions: number;
    netSalary: number;
    taxAmount: number;
    taxData: any;
    deductionData: any;
    createdAt: Date;
    updatedAt: Date;
    payroll: Payroll;
    employee: Employee;
}
//# sourceMappingURL=PayrollItem.d.ts.map