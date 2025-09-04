import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Account } from './Account';
import { TaxRate } from './TaxRate';
// Import the correct TaxReport entity
import { TaxReport as TaxReportEntity } from './TaxReport';

@Entity('tax_rules')
export class TaxRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  accountId!: number;

  @Column({ type: 'int' })
  taxRateId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'date' })
  validFrom!: Date;

  @Column({ type: 'date' })
  validTo!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Account, account => account.taxRules)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => TaxRate, taxRate => taxRate.taxRules)
  @JoinColumn({ name: 'tax_rate_id' })
  taxRate!: TaxRate;

  @OneToMany(() => TaxReportEntity, taxReport => taxReport.taxRule)
  taxReports!: TaxReportEntity[];
}