import { ChartOfAccounts } from './ChartOfAccounts';
import { Transaction } from './Transaction';
import { TaxRule } from './TaxRule';
import { InvoiceItem } from './InvoiceItem';
import { BillItem } from './BillItem';
export declare class Account {
    id: number;
    name: string;
    description: string;
    code: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    status: 'ACTIVE' | 'PASSIVE';
    balance: number;
    createdAt: Date;
    updatedAt: Date;
    chartOfAccounts: ChartOfAccounts;
    transactions: Transaction[];
    taxRules: TaxRule[];
    invoiceItems: InvoiceItem[];
    billItems: BillItem[];
}
//# sourceMappingURL=Account.d.ts.map