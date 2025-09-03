import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { ChartOfAccounts } from './ChartOfAccounts';
import { Transaction } from './Transaction';
import { TaxRule } from './TaxRule';
import { InvoiceItem } from './InvoiceItem';
import { BillItem } from './BillItem';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ unique: true })
  code!: string;

  @Column({
    type: 'enum',
    enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
    default: 'ASSET'
  })
  accountType!: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'PASSIVE'],
    default: 'ACTIVE'
  })
  status!: 'ACTIVE' | 'PASSIVE';

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ChartOfAccounts, chartOfAccounts => chartOfAccounts.accounts)
  chartOfAccounts!: ChartOfAccounts;

  @OneToMany(() => Transaction, transaction => transaction.account)
  transactions!: Transaction[];

  @OneToMany(() => TaxRule, taxRule => taxRule.account)
  taxRules!: TaxRule[];

  @OneToMany(() => InvoiceItem, invoiceItem => invoiceItem.account)
  invoiceItems!: InvoiceItem[];

  @OneToMany(() => BillItem, billItem => billItem.account)
  billItems!: BillItem[];
}