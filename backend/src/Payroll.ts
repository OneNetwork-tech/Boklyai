import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Company } from './Company';
import { PayrollItem } from './PayrollItem';

@Entity('payrolls')
export class Payroll {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'date' })
  paymentDate!: Date;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'APPROVED', 'PROCESSED', 'CANCELLED'],
    default: 'DRAFT'
  })
  status!: 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'CANCELLED';

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalGrossSalary!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDeductions!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalNetSalary!: number;

  @Column({ type: 'jsonb', nullable: true })
  payrollData!: any;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, company => company.payrolls)
  company!: Company;

  @OneToMany(() => PayrollItem, payrollItem => payrollItem.payroll)
  items!: PayrollItem[];
}