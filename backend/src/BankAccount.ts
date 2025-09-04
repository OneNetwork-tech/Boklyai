import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Bank } from './Bank';
import { Company } from './Company';
import { BankTransaction } from './BankTransaction';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  accountName!: string;

  @Column()
  accountNumber!: string;

  @Column({ nullable: true })
  iban!: string;

  @Column({ nullable: true })
  bic!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  accessToken!: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Bank, bank => bank.bankAccounts)
  bank!: Bank;

  @ManyToOne(() => Company, company => company.bankAccounts)
  company!: Company;

  @OneToMany(() => BankTransaction, transaction => transaction.bankAccount)
  transactions!: BankTransaction[];
}