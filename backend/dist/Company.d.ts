import { User } from './User';
import { Document } from './Document';
import { BankAccount } from './BankAccount';
import { TaxReport } from './TaxReport';
import { Invoice } from './Invoice';
import { Bill } from './Bill';
import { FinancialReport } from './FinancialReport';
import { Dashboard } from './Dashboard';
import { Kpi } from './Kpi';
import { Payroll } from './Payroll';
export declare class Company {
    id: number;
    name: string;
    organizationNumber: string;
    vatNumber: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    employees: User[];
    documents: Document[];
    bankAccounts: BankAccount[];
    taxReports: TaxReport[];
    invoices: Invoice[];
    bills: Bill[];
    financialReports: FinancialReport[];
    dashboards: Dashboard[];
    kpis: Kpi[];
    payrolls: Payroll[];
}
//# sourceMappingURL=Company.d.ts.map