import { Customer } from './Customer';
import { InvoiceItem } from './InvoiceItem';
import { Company } from './Company';
export declare class Invoice {
    id: number;
    invoiceNumber: string;
    reference: string;
    invoiceDate: Date;
    dueDate: Date;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    notes: string;
    isEInvoice: boolean;
    createdAt: Date;
    updatedAt: Date;
    customer: Customer;
    company: Company;
    items: InvoiceItem[];
}
//# sourceMappingURL=Invoice.d.ts.map