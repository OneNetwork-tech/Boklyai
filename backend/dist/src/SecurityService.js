"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const database_1 = require("./database");
const User_1 = require("./User");
const Role_1 = require("./Role");
const Permission_1 = require("./Permission");
const AuditLog_1 = require("./AuditLog");
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
class SecurityService {
    constructor() {
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User);
        this.roleRepository = database_1.AppDataSource.getRepository(Role_1.Role);
        this.permissionRepository = database_1.AppDataSource.getRepository(Permission_1.Permission);
        this.auditLogRepository = database_1.AppDataSource.getRepository(AuditLog_1.AuditLog);
    }
    /**
     * Create a new role
     * @param name Role name
     * @param description Role description
     */
    async createRole(name, description) {
        // Check if role with this name already exists
        const existingRole = await this.roleRepository.findOneBy({ name });
        if (existingRole) {
            throw new Error('Role with this name already exists');
        }
        const role = new Role_1.Role();
        role.name = name;
        role.description = description || '';
        role.isActive = true;
        return await this.roleRepository.save(role);
    }
    /**
     * Get all roles
     */
    async getAllRoles() {
        return await this.roleRepository.find({
            where: { isActive: true }
        });
    }
    /**
     * Get role by ID
     * @param id Role ID
     */
    async getRoleById(id) {
        return await this.roleRepository.findOne({
            where: { id, isActive: true }
        });
    }
    /**
     * Create a new permission
     * @param name Permission name
     * @param code Permission code
     * @param description Permission description
     */
    async createPermission(name, code, description) {
        // Check if permission with this name or code already exists
        const existingPermission = await this.permissionRepository.findOneBy([{ name }, { code }]);
        if (existingPermission) {
            throw new Error('Permission with this name or code already exists');
        }
        const permission = new Permission_1.Permission();
        permission.name = name;
        permission.code = code;
        permission.description = description || '';
        permission.isActive = true;
        return await this.permissionRepository.save(permission);
    }
    /**
     * Get all permissions
     */
    async getAllPermissions() {
        return await this.permissionRepository.find({
            where: { isActive: true }
        });
    }
    /**
     * Get permission by ID
     * @param id Permission ID
     */
    async getPermissionById(id) {
        return await this.permissionRepository.findOne({
            where: { id, isActive: true }
        });
    }
    /**
     * Assign permissions to a role
     * @param roleId Role ID
     * @param permissionIds Array of permission IDs
     */
    async assignPermissionsToRole(roleId, permissionIds) {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: ['permissions']
        });
        if (!role) {
            throw new Error('Role not found');
        }
        const permissions = await this.permissionRepository.findByIds(permissionIds);
        role.permissions = permissions;
        return await this.roleRepository.save(role);
    }
    /**
     * Assign role to user
     * @param userId User ID
     * @param roleId Role ID
     */
    async assignRoleToUser(userId, roleId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role']
        });
        if (!user) {
            throw new Error('User not found');
        }
        const role = await this.roleRepository.findOneBy({ id: roleId });
        if (!role) {
            throw new Error('Role not found');
        }
        user.role = role;
        return await this.userRepository.save(user);
    }
    /**
     * Check if user has a specific permission
     * @param userId User ID
     * @param permissionCode Permission code
     */
    async userHasPermission(userId, permissionCode) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role', 'role.permissions']
        });
        if (!user || !user.role) {
            return false;
        }
        return user.role.permissions.some(permission => permission.code === permissionCode);
    }
    /**
     * Authenticate user
     * @param email User email
     * @param password User password
     */
    async authenticateUser(email, password) {
        const user = await this.userRepository.findOne({
            where: { email, isActive: true },
            relations: ['company', 'role']
        });
        if (!user) {
            return null;
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        // Update last login timestamp
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);
        // Generate JWT token
        const token = jwt.sign({
            userId: user.id,
            email: user.email,
            companyId: user.company?.id,
            roleId: user.role?.id
        }, process.env.JWT_SECRET || 'boklyai_secret_key', { expiresIn: '24h' });
        return { user, token };
    }
    /**
     * Log an audit event
     * @param userId User ID
     * @param action Action performed
     * @param description Description of the action
     * @param metadata Additional metadata
     * @param ipAddress IP address of the request
     * @param userAgent User agent of the request
     */
    async logAuditEvent(userId, action, description, metadata, ipAddress, userAgent) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new Error('User not found');
        }
        const auditLog = new AuditLog_1.AuditLog();
        auditLog.user = user;
        auditLog.action = action;
        auditLog.description = description || '';
        auditLog.metadata = metadata;
        auditLog.ipAddress = ipAddress || '';
        auditLog.userAgent = userAgent || '';
        return await this.auditLogRepository.save(auditLog);
    }
    /**
     * Get audit logs for a user
     * @param userId User ID
     * @param limit Number of logs to retrieve
     */
    async getUserAuditLogs(userId, limit = 50) {
        return await this.auditLogRepository.find({
            where: { user: { id: userId } },
            order: { timestamp: 'DESC' },
            take: limit
        });
    }
    /**
     * Get audit logs for a company
     * @param companyId Company ID
     * @param limit Number of logs to retrieve
     */
    async getCompanyAuditLogs(companyId, limit = 100) {
        return await this.auditLogRepository
            .createQueryBuilder('auditLog')
            .leftJoinAndSelect('auditLog.user', 'user')
            .leftJoin('user.company', 'company')
            .where('company.id = :companyId', { companyId })
            .orderBy('auditLog.timestamp', 'DESC')
            .take(limit)
            .getMany();
    }
    /**
     * Generate password reset token
     * @param email User email
     */
    async generatePasswordResetToken(email) {
        const user = await this.userRepository.findOneBy({ email, isActive: true });
        if (!user) {
            return null;
        }
        const resetToken = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'boklyai_secret_key', { expiresIn: '1h' });
        user.passwordResetToken = await bcrypt.hash(resetToken, 10);
        user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now
        await this.userRepository.save(user);
        return resetToken;
    }
    /**
     * Reset user password
     * @param token Password reset token
     * @param newPassword New password
     */
    async resetUserPassword(token, newPassword) {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'boklyai_secret_key');
        }
        catch (error) {
            return false;
        }
        const user = await this.userRepository.findOne({
            where: {
                id: decoded.userId,
                passwordResetExpires: (0, typeorm_1.MoreThan)(new Date())
            }
        });
        if (!user || !user.passwordResetToken) {
            return false;
        }
        // Verify the token matches what's stored
        const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
        if (!isTokenValid) {
            return false;
        }
        // Hash the new password before saving
        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordResetToken = '';
        user.passwordResetExpires = new Date(0);
        await this.userRepository.save(user);
        return true;
    }
}
exports.SecurityService = SecurityService;
//# sourceMappingURL=SecurityService.js.map