"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICategorizationService = void 0;
const database_1 = require("./database");
const Transaction_1 = require("./Transaction");
const Category_1 = require("./Category");
const CategorizationFeedback_1 = require("./CategorizationFeedback");
class AICategorizationService {
    constructor() {
        this.transactionRepository = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
        this.categoryRepository = database_1.AppDataSource.getRepository(Category_1.Category);
        this.categorizationFeedbackRepository = database_1.AppDataSource.getRepository(CategorizationFeedback_1.CategorizationFeedback);
    }
    /**
     * Create a new category
     * @param name Category name
     * @param code Category code
     * @param type Category type (INCOME, EXPENSE, TRANSFER)
     * @param description Category description
     * @param parentId Parent category ID (for hierarchical categories)
     */
    async createCategory(name, code, type, description, parentId) {
        if (!name || !code || !type) {
            throw new Error('Name, code and type are required parameters');
        }
        // Check if category with this code already exists
        const existingCategory = await this.categoryRepository.findOne({
            where: { code }
        });
        if (existingCategory) {
            throw new Error(`Category with code ${code} already exists`);
        }
        const category = new Category_1.Category();
        category.name = name;
        category.code = code.toUpperCase(); // Ensure code is uppercase
        category.type = type;
        category.description = description || '';
        category.parentId = parentId ?? null;
        category.isActive = true;
        try {
            return await this.categoryRepository.save(category);
        }
        catch (error) {
            console.error(`Failed to create category: ${error.message}`);
            throw error;
        }
    }
    /**
     * Categorize a transaction using AI
     * @param transactionId Transaction ID
     * @param userId User ID (for feedback tracking)
     */
    async categorizeTransaction(transactionId, userId) {
        if (!transactionId || !userId) {
            throw new Error('Transaction ID and User ID are required parameters');
        }
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['account']
        });
        if (!transaction) {
            throw new Error(`Transaction with ID ${transactionId} not found`);
        }
        try {
            // Mock AI categorization logic
            // In a real implementation, this would call an AI service
            const category = await this.predictCategory(transaction.description, transaction.amount);
            if (category) {
                // Update transaction with predicted category
                // Note: You might want to create a TransactionCategory relationship instead
                // For now, we'll just return the predicted category
                console.log(`Transaction ${transactionId} categorized as ${category.code}`);
                return category;
            }
            console.warn(`No category predicted for transaction ${transactionId}`);
            return null;
        }
        catch (error) {
            console.error(`Transaction categorization failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Mock AI prediction method
     * @param description Transaction description
     * @param amount Transaction amount
     */
    async predictCategory(description, amount) {
        if (!description || amount === undefined) {
            throw new Error('Description and amount are required parameters');
        }
        // Simple rule-based categorization for demonstration
        const descriptionLower = description.toLowerCase();
        let categoryName = 'Other Expenses';
        let categoryCode = 'OTHER_EXPENSES';
        let type = 'EXPENSE';
        // Enhanced categorization rules
        if (descriptionLower.includes('salary') || descriptionLower.includes('payroll')) {
            categoryName = 'Salary';
            categoryCode = 'SALARY';
            type = 'INCOME';
        }
        else if (descriptionLower.includes('rent')) {
            categoryName = 'Rent';
            categoryCode = 'RENT';
        }
        else if (descriptionLower.includes('utility') || descriptionLower.includes('electric') ||
            descriptionLower.includes('water') || descriptionLower.includes('gas')) {
            categoryName = 'Utilities';
            categoryCode = 'UTILITIES';
        }
        else if (descriptionLower.includes('office') || descriptionLower.includes('supply') ||
            descriptionLower.includes('stationery') || descriptionLower.includes('paper')) {
            categoryName = 'Office Supplies';
            categoryCode = 'OFFICE_SUPPLIES';
        }
        else if (descriptionLower.includes('travel') || descriptionLower.includes('hotel') ||
            descriptionLower.includes('flight') || descriptionLower.includes('airbnb')) {
            categoryName = 'Travel Expenses';
            categoryCode = 'TRAVEL_EXPENSES';
        }
        else if (descriptionLower.includes('meal') || descriptionLower.includes('food') ||
            descriptionLower.includes('restaurant') || descriptionLower.includes('cafe')) {
            categoryName = 'Meals & Entertainment';
            categoryCode = 'MEALS_ENTERTAINMENT';
        }
        else if (descriptionLower.includes('dividend')) {
            categoryName = 'Investment Income';
            categoryCode = 'INVESTMENT_INCOME';
            type = 'INCOME';
        }
        else if (descriptionLower.includes('transfer') || descriptionLower.includes('reimbursement')) {
            categoryName = 'Internal Transfer';
            categoryCode = 'INTERNAL_TRANSFER';
            type = 'TRANSFER';
        }
        else if (amount > 0) {
            categoryName = 'Other Income';
            categoryCode = 'OTHER_INCOME';
            type = 'INCOME';
        }
        else if (amount < 0) {
            categoryName = 'Uncategorized Expense';
            categoryCode = 'UNCATEGORIZED_EXPENSE';
        }
        // Find or create the category
        let category = await this.categoryRepository.findOne({
            where: { code: categoryCode }
        });
        if (!category) {
            try {
                category = new Category_1.Category();
                category.name = categoryName;
                category.code = categoryCode.toUpperCase(); // Ensure code is uppercase
                category.description = `${categoryName} category`;
                category.type = type;
                category.isActive = true;
                category = await this.categoryRepository.save(category);
                console.log(`Created new category: ${categoryCode}`);
            }
            catch (error) {
                console.error(`Failed to create category ${categoryCode}: ${error.message}`);
                return null;
            }
        }
        return category;
    }
    /**
     * Submit categorization feedback
     * @param transactionId Transaction ID
     * @param categoryId Category ID
     * @param userId User ID
     * @param isCorrect Whether the categorization was correct
     * @param feedbackText Optional feedback text
     */
    async submitFeedback(transactionId, categoryId, userId, isCorrect, feedbackText) {
        if (!transactionId || !categoryId || !userId === undefined) {
            throw new Error('Transaction ID, Category ID and User ID are required parameters');
        }
        try {
            const feedback = new CategorizationFeedback_1.CategorizationFeedback();
            feedback.transactionId = transactionId;
            feedback.categoryId = categoryId;
            feedback.userId = userId;
            feedback.isCorrect = isCorrect;
            feedback.feedbackText = feedbackText || '';
            // Check if transaction and category exist
            const transaction = await this.transactionRepository.findOne({
                where: { id: transactionId }
            });
            const category = await this.categoryRepository.findOne({
                where: { id: categoryId }
            });
            if (!transaction) {
                throw new Error(`Transaction with ID ${transactionId} not found`);
            }
            if (!category) {
                throw new Error(`Category with ID ${categoryId} not found`);
            }
            return await this.categorizationFeedbackRepository.save(feedback);
        }
        catch (error) {
            console.error(`Failed to submit feedback: ${error.message}`);
            throw error;
        }
    }
    /**
     * Get categorization feedback for a user
     * @param userId User ID
     * @param limit Number of feedback items to retrieve
     */
    async getUserFeedback(userId, limit = 50) {
        return await this.categorizationFeedbackRepository.find({
            where: { userId },
            relations: ['transaction', 'category'],
            order: { createdAt: 'DESC' },
            take: limit
        });
    }
    /**
     * Train the AI model with feedback data
     * @param feedbackIds Array of feedback IDs to use for training
     */
    async trainModel(feedbackIds) {
        // Mock training implementation
        // In a real implementation, this would:
        // 1. Fetch feedback data
        // 2. Preprocess the data
        // 3. Train/update the AI model
        // 4. Save the updated model
        console.log(`Training model with ${feedbackIds.length} feedback items`);
        // Simulate training time
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    }
    /**
     * Get categorization accuracy statistics
     */
    async getAccuracyStats() {
        const feedback = await this.categorizationFeedbackRepository.find();
        const total = feedback.length;
        const correct = feedback.filter(f => f.isCorrect).length;
        const accuracy = total > 0 ? (correct / total) * 100 : 0;
        return { total, correct, accuracy };
    }
}
exports.AICategorizationService = AICategorizationService;
//# sourceMappingURL=AICategorizationService.js.map