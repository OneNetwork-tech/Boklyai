import axios from 'axios';
import { AppDataSource } from './database';
import { Transaction } from './Transaction';
import { Category } from './Category';
import { TransactionCategory } from './TransactionCategory';
import { CategorizationFeedback } from './CategorizationFeedback';
import { User } from './User';

export class AICategorizationService {
  private transactionRepository = AppDataSource.getRepository(Transaction);
  private categoryRepository = AppDataSource.getRepository(Category);
  private transactionCategoryRepository = AppDataSource.getRepository(TransactionCategory);
  private categorizationFeedbackRepository = AppDataSource.getRepository(CategorizationFeedback);
  private userRepository = AppDataSource.getRepository(User);
  
  private aiServiceUrl: string;

  constructor(aiServiceUrl?: string) {
    // Default to localhost:5000 for development
    this.aiServiceUrl = aiServiceUrl || process.env.AI_SERVICE_URL || 'http://localhost:5000';
  }

  /**
   * Create a new category
   * @param name Category name
   * @param code Category code
   * @param type Category type
   * @param description Category description
   * @param parentId Parent category ID (optional)
   */
  async createCategory(
    name: string,
    code: string,
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER',
    description?: string,
    parentId?: number
  ): Promise<Category> {
    const category = new Category();
    category.name = name;
    category.code = code;
    category.type = type;
    category.description = description;
    category.parentId = parentId;
    category.isActive = true;

    return await this.categoryRepository.save(category);
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true }
    });
  }

  /**
   * Get category by ID
   * @param id Category ID
   */
  async getCategoryById(id: number): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { id, isActive: true }
    });
  }

  /**
   * Categorize a transaction using AI
   * @param transactionId Transaction ID
   */
  async categorizeTransaction(transactionId: number): Promise<TransactionCategory> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['account']
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      // In a real implementation, this would call the AI service
      // For now, we'll return mock data
      console.log(`Categorizing transaction ${transactionId} with AI service at ${this.aiServiceUrl}`);
      
      // This is a placeholder implementation
      // In a real implementation, you would send the transaction data to the AI service
      // and receive the categorization results back
      
      // Mock categorization result
      const mockCategories = await this.categoryRepository.find({ where: { isActive: true } });
      if (mockCategories.length === 0) {
        throw new Error('No categories available');
      }
      
      // Select a random category for mock purposes
      const randomCategory = mockCategories[Math.floor(Math.random() * mockCategories.length)];
      
      // Create transaction category record
      const transactionCategory = new TransactionCategory();
      transactionCategory.transaction = transaction;
      transactionCategory.category = randomCategory;
      transactionCategory.confidence = 0.85 + Math.random() * 0.15; // 85-100% confidence
      transactionCategory.source = 'AI_MODEL';
      transactionCategory.isManual = false;
      
      return await this.transactionCategoryRepository.save(transactionCategory);
    } catch (error) {
      console.error('AI categorization error:', error);
      throw new Error('AI categorization failed');
    }
  }

  /**
   * Manually categorize a transaction
   * @param transactionId Transaction ID
   * @param categoryId Category ID
   * @param userId User ID (for feedback tracking)
   */
  async manuallyCategorizeTransaction(
    transactionId: number,
    categoryId: number,
    userId: number
  ): Promise<TransactionCategory> {
    const transaction = await this.transactionRepository.findOneBy({ id: transactionId });
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const category = await this.categoryRepository.findOneBy({ id: categoryId });
    if (!category) {
      throw new Error('Category not found');
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if there was a previous AI categorization
    const previousCategory = await this.transactionCategoryRepository.findOne({
      where: {
        transaction: { id: transactionId },
        isManual: false
      },
      order: {
        createdAt: 'DESC'
      }
    });

    // Create manual categorization
    const transactionCategory = new TransactionCategory();
    transactionCategory.transaction = transaction;
    transactionCategory.category = category;
    transactionCategory.confidence = 1.0; // 100% confidence for manual categorization
    transactionCategory.source = 'MANUAL';
    transactionCategory.isManual = true;
    
    const savedTransactionCategory = await this.transactionCategoryRepository.save(transactionCategory);

    // If there was a previous AI categorization, record feedback
    if (previousCategory) {
      const feedback = new CategorizationFeedback();
      feedback.transaction = transaction;
      feedback.previousCategory = previousCategory.category;
      feedback.correctCategory = category;
      feedback.user = user;
      feedback.previousConfidence = previousCategory.confidence;
      
      await this.categorizationFeedbackRepository.save(feedback);
    }

    return savedTransactionCategory;
  }

  /**
   * Get all categorizations for a transaction
   * @param transactionId Transaction ID
   */
  async getTransactionCategories(transactionId: number): Promise<TransactionCategory[]> {
    return await this.transactionCategoryRepository.find({
      where: {
        transaction: { id: transactionId }
      },
      relations: ['category'],
      order: {
        createdAt: 'DESC'
      }
    });
  }

  /**
   * Get categorization feedback
   * @param limit Number of feedback records to retrieve
   */
  async getCategorizationFeedback(limit: number = 100): Promise<CategorizationFeedback[]> {
    return await this.categorizationFeedbackRepository.find({
      take: limit,
      order: {
        createdAt: 'DESC'
      },
      relations: ['transaction', 'previousCategory', 'correctCategory', 'user']
    });
  }

  /**
   * Retrain the AI model with feedback data
   */
  async retrainModel(): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, this would call the AI service to retrain the model
      // with the feedback data
      console.log(`Retraining AI model with feedback data at ${this.aiServiceUrl}`);
      
      // Mock implementation
      return {
        success: true,
        message: 'Model retraining initiated successfully'
      };
    } catch (error) {
      console.error('Model retraining error:', error);
      return {
        success: false,
        message: 'Model retraining failed'
      };
    }
  }
}