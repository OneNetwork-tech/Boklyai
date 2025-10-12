import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Company } from './Company';

@Entity('annual_reports')
export class AnnualReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Company, company => company.annualReports)
  company!: Company;

  @Column({ type: 'int' })
  fiscalYear!: number;

  @Column({ type: 'jsonb' })
  balanceSheet!: any;

  @Column({ type: 'jsonb' })
  incomeStatement!: any;

  @Column({ type: 'jsonb', nullable: true })
  cashFlowStatement!: any;

  @Column({ type: 'jsonb', nullable: true })
  boardStatement!: any;

  @Column({ type: 'jsonb', nullable: true })
  sustainabilityReport!: any;

  @Column({ type: 'enum', enum: ['DRAFT', 'APPROVED', 'SUBMITTED'], default: 'DRAFT' })
  status!: 'DRAFT' | 'APPROVED' | 'SUBMITTED';

  @Column({ type: 'date', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  signature!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
