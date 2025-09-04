import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Payroll } from './Payroll';
import { Employee } from './Employee';

@Entity('payroll_items')
export class PayrollItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grossSalary!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxableIncome!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  preTaxDeductions!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  postTaxDeductions!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  netSalary!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'jsonb', nullable: true })
  taxData!: any;

  @Column({ type: 'jsonb', nullable: true })
  deductionData!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Payroll, payroll => payroll.items)
  payroll!: Payroll;

  @ManyToOne(() => Employee, employee => employee.payrollItems)
  employee!: Employee;
}