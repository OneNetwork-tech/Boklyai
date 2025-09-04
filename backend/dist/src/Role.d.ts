import { User } from './User';
import { Permission } from './Permission';
export declare class Role {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    users: User[];
    permissions: Permission[];
}
//# sourceMappingURL=Role.d.ts.map