import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from './Company';

@Entity('financial_reports')
export class FinancialReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW', 'CUSTOM'],
    default: 'CUSTOM'
  })
  type!: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'CUSTOM';

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  @Column({ type: 'jsonb', nullable: true })
  reportData!: any;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'FINAL', 'ARCHIVED'],
    default: 'DRAFT'
  })
  status!: 'DRAFT' | 'FINAL' | 'ARCHIVED';

  @Column({ default: false })
  isPublic!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, company => company.financialReports)
  company!: Company;
}