import { Bill } from './Bill';
import { Account } from './Account';
export declare class BillItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
    bill: Bill;
    account: Account;
}
//# sourceMappingURL=BillItem.d.ts.map