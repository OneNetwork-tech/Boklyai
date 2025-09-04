import { Invoice } from './Invoice';
import { Account } from './Account';
export declare class InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
    invoice: Invoice;
    account: Account;
}
//# sourceMappingURL=InvoiceItem.d.ts.map