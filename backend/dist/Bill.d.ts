import { Vendor } from './Vendor';
import { BillItem } from './BillItem';
import { Company } from './Company';
export declare class Bill {
    id: number;
    billNumber: string;
    reference: string;
    billDate: Date;
    dueDate: Date;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    description: string;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    vendor: Vendor;
    company: Company;
    items: BillItem[];
}
//# sourceMappingURL=Bill.d.ts.map