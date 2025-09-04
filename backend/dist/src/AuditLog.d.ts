import { User } from './User';
export declare class AuditLog {
    id: number;
    action: string;
    description: string;
    metadata: any;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    user: User;
}
//# sourceMappingURL=AuditLog.d.ts.map