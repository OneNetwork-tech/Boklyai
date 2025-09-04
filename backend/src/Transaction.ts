import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Account } from './Account';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  description!: string;

  @Column({ type: 'date' })
  transactionDate!: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;
  
  @Column({ nullable: true })
  matchedBankTransactionId?: number;

  @Column({ default: false })
  isMatched!: boolean;

  @Column({
    type: 'enum',
    enum: ['DEBIT', 'CREDIT'],
  })
  type!: 'DEBIT' | 'CREDIT';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Account, account => account.transactions)
  account!: Account;
}