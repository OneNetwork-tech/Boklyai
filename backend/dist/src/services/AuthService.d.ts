import { User } from '../User';
export interface AuthResponse {
    user: User;
    token: string;
    expiresIn: number;
}
export declare class AuthService {
    private userService;
    private jwtSecret;
    private tokenExpiry;
    /**
     * Register a new user
     */
    register(email: string, password: string, firstName?: string, lastName?: string, phone?: string): Promise<AuthResponse>;
    /**
     * Login user
     */
    login(email: string, password: string): Promise<AuthResponse>;
    /**
     * Generate JWT token
     */
    private generateToken;
    /**
     * Verify JWT token
     */
    verifyToken(token: string): any;
    /**
     * Change user password
     */
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;
    /**
     * Request password reset
     */
    requestPasswordReset(email: string): Promise<string>;
}
//# sourceMappingURL=AuthService.d.ts.map