import { Bank } from './Bank';
import { Company } from './Company';
import { BankTransaction } from './BankTransaction';
export declare class BankAccount {
    id: number;
    accountName: string;
    accountNumber: string;
    iban: string;
    bic: string;
    balance: number;
    isActive: boolean;
    accessToken: string;
    tokenExpiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    bank: Bank;
    company: Company;
    transactions: BankTransaction[];
}
//# sourceMappingURL=BankAccount.d.ts.map