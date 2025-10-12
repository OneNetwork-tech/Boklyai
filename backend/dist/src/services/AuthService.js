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
exports.AuthService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const UserService_1 = require("./UserService");
class AuthService {
    constructor() {
        this.userService = new UserService_1.UserService();
        this.jwtSecret = process.env.JWT_SECRET || 'boklyai_jwt_secret_fallback';
        this.tokenExpiry = process.env.JWT_EXPIRY || '24h';
    }
    /**
     * Register a new user
     */
    async register(email, password, firstName, lastName, phone) {
        // Create user
        const user = await this.userService.createUser(email, password, firstName, lastName, phone);
        // Generate token
        const token = this.generateToken(user);
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token,
            expiresIn: 24 * 60 * 60 // 24 hours in seconds
        };
    }
    /**
     * Login user
     */
    async login(email, password) {
        // Validate credentials
        const user = await this.userService.validateCredentials(email, password);
        if (!user) {
            throw new Error('Invalid email or password');
        }
        // Update last login
        await this.userService.updateLastLogin(user.id);
        // Generate token
        const token = this.generateToken(user);
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token,
            expiresIn: 24 * 60 * 60 // 24 hours in seconds
        };
    }
    /**
     * Generate JWT token
     */
    generateToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            companyId: user.company?.id,
            roleId: user.role?.id
        };
        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.tokenExpiry
        });
    }
    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        // Verify current password
        const isValid = await user.validatePassword(currentPassword);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }
        // Update password
        user.password = newPassword;
        await this.userService['userRepository'].save(user);
        return true;
    }
    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            // Don't reveal whether email exists for security
            return 'If the email exists, a reset link has been sent';
        }
        // Generate reset token (simple implementation)
        const resetToken = jwt.sign({ userId: user.id, email: user.email }, this.jwtSecret + user.password, // Include password in secret to invalidate when password changes
        { expiresIn: '1h' });
        // In a real implementation, you would:
        // 1. Store the reset token in the database
        // 2. Send an email with the reset link
        return resetToken; // For now, return the token directly
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map