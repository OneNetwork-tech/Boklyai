import { Account } from './Account';
import { TaxRate } from './TaxRate';
import { TaxReport as TaxReportEntity } from './TaxReport';
export declare class TaxRule {
    id: number;
    accountId: number;
    taxRateId: number;
    name: string;
    description: string;
    validFrom: Date;
    validTo: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    account: Account;
    taxRate: TaxRate;
    taxReports: TaxReportEntity[];
}
//# sourceMappingURL=TaxRule.d.ts.map