import { TaxRule } from './TaxRule';
export declare class TaxRate {
    id: number;
    name: string;
    rate: number;
    description: string;
    status: 'ACTIVE' | 'INACTIVE';
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    taxRules: TaxRule[];
}
//# sourceMappingURL=TaxRate.d.ts.map