import { Invoice } from './Invoice';
export declare class Customer {
    id: number;
    name: string;
    organizationNumber: string;
    vatNumber: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    notes: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    invoices: Invoice[];
}
//# sourceMappingURL=Customer.d.ts.map