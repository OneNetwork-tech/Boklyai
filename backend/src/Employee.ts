import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Company } from './Company';
import { PayrollItem } from './PayrollItem';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  personalNumber!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  postalCode!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({ type: 'date', nullable: true })
  startDate!: Date;

  @Column({ type: 'date', nullable: true })
  endDate!: Date;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'],
    default: 'ACTIVE'
  })
  status!: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salary!: number;

  @Column({ nullable: true })
  position!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, company => company.employees)
  company!: Company;

  @OneToMany(() => PayrollItem, payrollItem => payrollItem.employee)
  payrollItems!: PayrollItem[];
}