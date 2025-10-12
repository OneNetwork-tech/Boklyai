import { Company } from './Company';
import { PayrollItem } from './PayrollItem';
export declare class Employee {
    id: number;
    firstName: string;
    lastName: string;
    personalNumber: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    startDate: Date;
    endDate: Date;
    status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
    salary: number;
    position: string;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    payrollItems: PayrollItem[];
}
//# sourceMappingURL=Employee.d.ts.map