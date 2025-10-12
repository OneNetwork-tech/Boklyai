import * as jwt from 'jsonwebtoken';
import { UserService } from './UserService';
import { User } from '../User';

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export class AuthService {
  private userService = new UserService();
  private jwtSecret = process.env.JWT_SECRET || 'boklyai_jwt_secret_fallback';
  private tokenExpiry = process.env.JWT_EXPIRY || '24h';

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ): Promise<AuthResponse> {
    // Create user
    const user = await this.userService.createUser(email, password, firstName, lastName, phone);
    
    // Generate token
    const token = this.generateToken(user);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword as User,
      token,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
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
      user: userWithoutPassword as User,
      token,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      companyId: user.company?.id,
      roleId: user.role?.id
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
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
  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.userService.findByEmail(email);
    
    if (!user) {
      // Don't reveal whether email exists for security
      return 'If the email exists, a reset link has been sent';
    }

    // Generate reset token (simple implementation)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      this.jwtSecret + user.password, // Include password in secret to invalidate when password changes
      { expiresIn: '1h' }
    );

    // In a real implementation, you would:
    // 1. Store the reset token in the database
    // 2. Send an email with the reset link
    
    return resetToken; // For now, return the token directly
  }
}