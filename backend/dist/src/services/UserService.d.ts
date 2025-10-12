import { User } from '../User';
export declare class UserService {
    private userRepository;
    private companyRepository;
    private roleRepository;
    /**
     * Create a new user
     */
    createUser(email: string, password: string, firstName?: string, lastName?: string, phone?: string): Promise<User>;
    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<User | null>;
    /**
     * Find user by ID
     */
    findById(id: number): Promise<User | null>;
    /**
     * Validate user credentials
     */
    validateCredentials(email: string, password: string): Promise<User | null>;
    /**
     * Update user last login timestamp
     */
    updateLastLogin(userId: number): Promise<void>;
    /**
     * Get all users
     */
    getAllUsers(): Promise<User[]>;
    /**
     * Delete user
     */
    deleteUser(userId: number): Promise<boolean>;
}
//# sourceMappingURL=UserService.d.ts.map