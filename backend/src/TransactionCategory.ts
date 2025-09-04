import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Transaction } from './Transaction';
import { Category } from './Category';
import { User } from './User';

@Entity('transaction_categories')
export class TransactionCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  transactionId!: number;

  @Column({ type: 'int' })
  categoryId!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence!: number;

  @Column({ type: 'varchar', length: 50 })
  source!: string;

  @Column({ type: 'boolean', default: false })
  isManual!: boolean;

  @Column({ type: 'int', nullable: true })
  userId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Fixed: Removed the reverse relationship reference since it doesn't exist in Transaction entity
  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  // Fixed: Removed the reverse relationship reference since it doesn't exist in Category entity
  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  // Fixed: Removed the reverse relationship reference since it doesn't exist in User entity
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}