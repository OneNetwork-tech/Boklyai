import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from './Company';
import { TaxRule } from './TaxRule';

@Entity('tax_reports')
export class TaxReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  @Column({ type: 'date', nullable: true })
  dueDate!: Date;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    default: 'DRAFT'
  })
  status!: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalSales!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPurchases!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatToPay!: number;

  @Column({ type: 'jsonb', nullable: true })
  reportData!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, company => company.taxReports)
  company!: Company;

  @ManyToOne(() => TaxRule, taxRule => taxRule.taxReports)
  taxRule!: TaxRule;
}