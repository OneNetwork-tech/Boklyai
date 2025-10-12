import { AppDataSource } from '../database';
import { User } from '../User';
import { Company } from '../Company';
import { Role } from '../Role';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private companyRepository = AppDataSource.getRepository(Company);
  private roleRepository = AppDataSource.getRepository(Role);

  /**
   * Create a new user
   */
  async createUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create new user
    const user = new User();
    user.email = email;
    user.password = password; // Will be hashed by the @BeforeInsert hook
    user.firstName = firstName || '';
    user.lastName = lastName || '';
    user.phone = phone || '';
    user.isActive = true;
    user.isEmailVerified = false;

    // Assign default role (you might want to create a default role first)
    try {
      const defaultRole = await this.roleRepository.findOne({ where: { name: 'User' } });
      if (defaultRole) {
        user.role = defaultRole;
      }
    } catch (error) {
      console.warn('No default role found, proceeding without role assignment');
    }

    return await this.userRepository.save(user);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['company', 'role']
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ['company', 'role']
    });
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await user.validatePassword(password);
    return isValid ? user : null;
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date()
    });
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['company', 'role']
    });
  }

  /**
   * Delete user
   */
  async deleteUser(userId: number): Promise<boolean> {
    const result = await this.userRepository.delete(userId);
    return (result.affected || 0) > 0;
  }
}