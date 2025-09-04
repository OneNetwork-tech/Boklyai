import { Company } from './Company';
import { Role } from './Role';
import { AuditLog } from './AuditLog';
export declare class User {
    id: number;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt: Date;
    passwordResetToken: string;
    passwordResetExpires: Date;
    twoFactorSecret: string;
    twoFactorEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    role: Role;
    auditLogs: AuditLog[];
    hashPassword(): Promise<void>;
}
//# sourceMappingURL=User.d.ts.map