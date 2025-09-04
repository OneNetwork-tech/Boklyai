import { Category } from './Category';
import { CategorizationFeedback } from './CategorizationFeedback';
export declare class AICategorizationService {
    private transactionRepository;
    private categoryRepository;
    private categorizationFeedbackRepository;
    /**
     * Create a new category
     * @param name Category name
     * @param code Category code
     * @param type Category type (INCOME, EXPENSE, TRANSFER)
     * @param description Category description
     * @param parentId Parent category ID (for hierarchical categories)
     */
    createCategory(name: string, code: string, type: 'INCOME' | 'EXPENSE' | 'TRANSFER', description?: string, parentId?: number): Promise<Category>;
    /**
     * Categorize a transaction using AI
     * @param transactionId Transaction ID
     * @param userId User ID (for feedback tracking)
     */
    categorizeTransaction(transactionId: number, userId: number): Promise<Category | null>;
    /**
     * Mock AI prediction method
     * @param description Transaction description
     * @param amount Transaction amount
     */
    private predictCategory;
    /**
     * Submit categorization feedback
     * @param transactionId Transaction ID
     * @param categoryId Category ID
     * @param userId User ID
     * @param isCorrect Whether the categorization was correct
     * @param feedbackText Optional feedback text
     */
    submitFeedback(transactionId: number, categoryId: number, userId: number, isCorrect: boolean, feedbackText?: string): Promise<CategorizationFeedback>;
    /**
     * Get categorization feedback for a user
     * @param userId User ID
     * @param limit Number of feedback items to retrieve
     */
    getUserFeedback(userId: number, limit?: number): Promise<CategorizationFeedback[]>;
    /**
     * Train the AI model with feedback data
     * @param feedbackIds Array of feedback IDs to use for training
     */
    trainModel(feedbackIds: number[]): Promise<boolean>;
    /**
     * Get categorization accuracy statistics
     */
    getAccuracyStats(): Promise<{
        total: number;
        correct: number;
        accuracy: number;
    }>;
}
//# sourceMappingURL=AICategorizationService.d.ts.map