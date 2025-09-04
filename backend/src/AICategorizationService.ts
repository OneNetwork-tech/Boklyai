import { AppDataSource } from './database';
import { Transaction } from './Transaction';
import { Category } from './Category';
import { CategorizationFeedback } from './CategorizationFeedback';
import { User } from './User';

export class AICategorizationService {
  private transactionRepository = AppDataSource.getRepository(Transaction);
  private categoryRepository = AppDataSource.getRepository(Category);
  private categorizationFeedbackRepository = AppDataSource.getRepository(CategorizationFeedback);

  /**
   
   * @param transactionId Transaction ID
   * @param userId User ID (for feedback tracking)
   */
  async categorizeTransaction(transactionId: number, userId: number): Promise<Category | null> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['account']
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Mock AI categorization logic
    // In a real implementation, this would call an AI service
    const category = await this.predictCategory(transaction.description, transaction.amount);

    if (category) {
      // Update transaction with predicted category
      // Note: You might want to create a TransactionCategory relationship instead
      // For now, we'll just return the predicted category
      return category;
    }

    return null;
  }

  /**
   * Mock AI prediction method
   * @param description Transaction description
   * @param amount Transaction amount
   */
  private async predictCategory(description: string, amount: number): Promise<Category | null> {
    // Simple rule-based categorization for demonstration
    const descriptionLower = description.toLowerCase();

    let categoryName = 'Other Expenses';
    let categoryCode = 'OTHER_EXPENSES';
    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';

    if (descriptionLower.includes('salary') || descriptionLower.includes('payroll')) {
      categoryName = 'Salary';
      categoryCode = 'SALARY';
      type = 'INCOME';
    } else if (descriptionLower.includes('rent')) {
      categoryName = 'Rent';
      categoryCode = 'RENT';
    } else if (descriptionLower.includes('utility') || descriptionLower.includes('electric') || descriptionLower.includes('water')) {
      categoryName = 'Utilities';
      categoryCode = 'UTILITIES';
    } else if (descriptionLower.includes('office') || descriptionLower.includes('supply')) {
      categoryName = 'Office Supplies';
      categoryCode = 'OFFICE_SUPPLIES';
    } else if (descriptionLower.includes('travel') || descriptionLower.includes('hotel') || descriptionLower.includes('flight')) {
      categoryName = 'Travel Expenses';
      categoryCode = 'TRAVEL_EXPENSES';
    } else if (descriptionLower.includes('meal') || descriptionLower.includes('food') || descriptionLower.includes('restaurant')) {
      categoryName = 'Meals & Entertainment';
      categoryCode = 'MEALS_ENTERTAINMENT';
    } else if (amount > 0) {
      categoryName = 'Other Income';
      categoryCode = 'OTHER_INCOME';
      type = 'INCOME';
    }

    // Find or create the category
    let category = await this.categoryRepository.findOne({
      where: { code: categoryCode }
    });

    if (!category) {
      category = new Category();
      category.name = categoryName;
      category.code = categoryCode;
      category.description = `${categoryName} category`;
      category.type = type;
      category.isActive = true;

      category = await this.categoryRepository.save(category);
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
  async submitFeedback(
    transactionId: number,
    categoryId: number,
    userId: number,
    isCorrect: boolean,
    feedbackText?: string
  ): Promise<CategorizationFeedback> {
    const feedback = new CategorizationFeedback();
    feedback.transactionId = transactionId;
    feedback.categoryId = categoryId;
    feedback.userId = userId;
    feedback.isCorrect = isCorrect;
    feedback.feedbackText = feedbackText || '';

    return await this.categorizationFeedbackRepository.save(feedback);
  }

  /**
   * Get categorization feedback for a user
   * @param userId User ID
   * @param limit Number of feedback items to retrieve
   */
  async getUserFeedback(userId: number, limit: number = 50): Promise<CategorizationFeedback[]> {
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
  async trainModel(feedbackIds: number[]): Promise<boolean> {
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
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({ where: { isActive: true } });
  }

  /**
   * Create a new category
   * @param name Category name
   * @param code Category code
   * @param type Category type (INCOME, EXPENSE, TRANSFER)
   * @param description Category description
   * @param parentId Parent category ID (for hierarchical categories)
   */
  async createCategory(
    name: string,
    code: string,
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER',
    description?: string,
    parentId?: number
  ): Promise<Category> {
    if (!name || !code || !type) {
      throw new Error('Name, code and type are required parameters');
    }

    // Check if category with this code already exists
    const existingCategory = await this.categoryRepository.findOneBy({ code });
    if (existingCategory) {
      throw new Error(`Category with code ${code} already exists`);
    }

    const category = new Category();
    category.name = name;
    category.code = code;
    category.type = type;
    category.description = description || '';
    category.parentId = parentId || 0; // Set to 0 if not provided (0 means no parent)
    category.isActive = true;

    return await this.categoryRepository.save(category);
  }

  /**
   * Provide feedback for categorization
   * @param transactionId Transaction ID
   * @param categoryId Category ID
   * @param userId User ID
   * @param isCorrect Whether the categorization was correct
   */
  async provideFeedback(
    transactionId: number,
    categoryId: number,
    userId: number,
    isCorrect: boolean
  ): Promise<CategorizationFeedback> {
    const feedback = new CategorizationFeedback();
    feedback.transaction = { id: transactionId } as Transaction;
    feedback.category = { id: categoryId } as Category;
    feedback.user = { id: userId } as User;
    feedback.isCorrect = isCorrect;
    
    return await this.categorizationFeedbackRepository.save(feedback);
  }

  /**
   * Get categorization accuracy statistics
   */
  async getAccuracyStats(): Promise<{ total: number; correct: number; accuracy: number }> {
    const feedback = await this.categorizationFeedbackRepository.find();
    
    const total = feedback.length;
    const correct = feedback.filter(f => f.isCorrect).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return { total, correct, accuracy };
  }
}