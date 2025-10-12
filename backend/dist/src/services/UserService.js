"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const database_1 = require("../database");
const User_1 = require("../User");
const Company_1 = require("../Company");
const Role_1 = require("../Role");
class UserService {
    constructor() {
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User);
        this.companyRepository = database_1.AppDataSource.getRepository(Company_1.Company);
        this.roleRepository = database_1.AppDataSource.getRepository(Role_1.Role);
    }
    /**
     * Create a new user
     */
    async createUser(email, password, firstName, lastName, phone) {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('User already exists with this email');
        }
        // Create new user
        const user = new User_1.User();
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
        }
        catch (error) {
            console.warn('No default role found, proceeding without role assignment');
        }
        return await this.userRepository.save(user);
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        return await this.userRepository.findOne({
            where: { email },
            relations: ['company', 'role']
        });
    }
    /**
     * Find user by ID
     */
    async findById(id) {
        return await this.userRepository.findOne({
            where: { id },
            relations: ['company', 'role']
        });
    }
    /**
     * Validate user credentials
     */
    async validateCredentials(email, password) {
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
    async updateLastLogin(userId) {
        await this.userRepository.update(userId, {
            lastLoginAt: new Date()
        });
    }
    /**
     * Get all users
     */
    async getAllUsers() {
        return await this.userRepository.find({
            relations: ['company', 'role']
        });
    }
    /**
     * Delete user
     */
    async deleteUser(userId) {
        const result = await this.userRepository.delete(userId);
        return (result.affected || 0) > 0;
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map