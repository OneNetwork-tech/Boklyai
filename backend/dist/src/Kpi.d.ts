import { Company } from './Company';
export declare class Kpi {
    id: number;
    name: string;
    code: string;
    description: string;
    currentValue: number;
    previousValue: number;
    targetValue: number;
    unit: string;
    category: string;
    calculationParams: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
}
//# sourceMappingURL=Kpi.d.ts.map