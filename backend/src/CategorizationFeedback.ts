import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Transaction } from './Transaction';
import { Category } from './Category';
import { User } from './User';

@Entity('categorization_feedback')
export class CategorizationFeedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  transactionId!: number;

  @Column({ type: 'int' })
  categoryId!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'text', nullable: true })
  feedbackText!: string;

  @Column({ type: 'boolean', default: true })
  isCorrect!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Transaction, transaction => transaction.id)
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  @ManyToOne(() => Category, category => category.id)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'user_id' })
  user!: User;
  
  @Column({ nullable: true })
  matchedBankTransactionId?: number;

  @Column({ default: false })
  isMatched!: boolean;
}