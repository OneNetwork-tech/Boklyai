import { User } from './User';
import { Role } from './Role';
import { Permission } from './Permission';
import { AuditLog } from './AuditLog';
export declare class SecurityService {
    private userRepository;
    private roleRepository;
    private permissionRepository;
    private auditLogRepository;
    /**
     * Create a new role
     * @param name Role name
     * @param description Role description
     */
    createRole(name: string, description?: string): Promise<Role>;
    /**
     * Get all roles
     */
    getAllRoles(): Promise<Role[]>;
    /**
     * Get role by ID
     * @param id Role ID
     */
    getRoleById(id: number): Promise<Role | null>;
    /**
     * Create a new permission
     * @param name Permission name
     * @param code Permission code
     * @param description Permission description
     */
    createPermission(name: string, code: string, description?: string): Promise<Permission>;
    /**
     * Get all permissions
     */
    getAllPermissions(): Promise<Permission[]>;
    /**
     * Get permission by ID
     * @param id Permission ID
     */
    getPermissionById(id: number): Promise<Permission | null>;
    /**
     * Assign permissions to a role
     * @param roleId Role ID
     * @param permissionIds Array of permission IDs
     */
    assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<Role>;
    /**
     * Assign role to user
     * @param userId User ID
     * @param roleId Role ID
     */
    assignRoleToUser(userId: number, roleId: number): Promise<User>;
    /**
     * Check if user has a specific permission
     * @param userId User ID
     * @param permissionCode Permission code
     */
    userHasPermission(userId: number, permissionCode: string): Promise<boolean>;
    /**
     * Authenticate user
     * @param email User email
     * @param password User password
     */
    authenticateUser(email: string, password: string): Promise<{
        user: User;
        token: string;
    } | null>;
    /**
     * Log an audit event
     * @param userId User ID
     * @param action Action performed
     * @param description Description of the action
     * @param metadata Additional metadata
     * @param ipAddress IP address of the request
     * @param userAgent User agent of the request
     */
    logAuditEvent(userId: number, action: string, description?: string, metadata?: any, ipAddress?: string, userAgent?: string): Promise<AuditLog>;
    /**
     * Get audit logs for a user
     * @param userId User ID
     * @param limit Number of logs to retrieve
     */
    getUserAuditLogs(userId: number, limit?: number): Promise<AuditLog[]>;
    /**
     * Get audit logs for a company
     * @param companyId Company ID
     * @param limit Number of logs to retrieve
     */
    getCompanyAuditLogs(companyId: number, limit?: number): Promise<AuditLog[]>;
    /**
     * Generate password reset token
     * @param email User email
     */
    generatePasswordResetToken(email: string): Promise<string | null>;
    /**
     * Reset user password
     * @param token Password reset token
     * @param newPassword New password
     */
    resetUserPassword(token: string, newPassword: string): Promise<boolean>;
}
//# sourceMappingURL=SecurityService.d.ts.map