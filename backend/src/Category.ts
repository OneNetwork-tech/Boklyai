import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TransactionCategory } from './TransactionCategory';
import { CategorizationFeedback } from './CategorizationFeedback';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
    default: 'EXPENSE'
  })
  type!: 'INCOME' | 'EXPENSE' | 'TRANSFER';

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  parentId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => TransactionCategory, transactionCategory => transactionCategory.category)
  transactionCategories!: TransactionCategory[];

  @OneToMany(() => CategorizationFeedback, feedback => feedback.category)
  categorizationFeedback!: CategorizationFeedback[];
}