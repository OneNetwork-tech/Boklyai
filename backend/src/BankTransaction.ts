import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { BankAccount } from './BankAccount';

@Entity('bank_transactions')
export class BankTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  externalId!: string;

  @Column({ type: 'date' })
  transactionDate!: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column()
  description!: string;

  @Column({ nullable: true })
  reference!: string;

  @Column({ nullable: true })
  currency!: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CLEARED', 'FAILED'],
    default: 'PENDING'
  })
  status!: 'PENDING' | 'CLEARED' | 'FAILED';

  @Column({
    type: 'enum',
    enum: ['CREDIT', 'DEBIT'],
  })
  type!: 'CREDIT' | 'DEBIT';

  @Column({ default: false })
  isMatched!: boolean;

  @Column({ nullable: true })
  matchedTransactionId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => BankAccount, bankAccount => bankAccount.transactions)
  bankAccount!: BankAccount;
}