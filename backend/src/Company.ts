import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Document } from './Document';
import { BankAccount } from './BankAccount';
import { TaxReport } from './TaxReport';
import { Invoice } from './Invoice';
import { Bill } from './Bill';
import { FinancialReport } from './FinancialReport';
import { Dashboard } from './Dashboard';
import { Kpi } from './Kpi';
import { Payroll } from './Payroll';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  organizationNumber!: string;

  @Column({ nullable: true })
  vatNumber!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  postalCode!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => User, user => user.company)
  employees!: User[];

  @OneToMany(() => Document, document => document.company)
  documents!: Document[];

  @OneToMany(() => BankAccount, bankAccount => bankAccount.company)
  bankAccounts!: BankAccount[];

  @OneToMany(() => TaxReport, taxReport => taxReport.company)
  taxReports!: TaxReport[];

  @OneToMany(() => Invoice, invoice => invoice.company)
  invoices!: Invoice[];

  @OneToMany(() => Bill, bill => bill.company)
  bills!: Bill[];

  @OneToMany(() => FinancialReport, financialReport => financialReport.company)
  financialReports!: FinancialReport[];

  @OneToMany(() => Dashboard, dashboard => dashboard.company)
  dashboards!: Dashboard[];

  @OneToMany(() => Kpi, kpi => kpi.company)
  kpis!: Kpi[];

  @OneToMany(() => Payroll, payroll => payroll.company)
  payrolls!: Payroll[];
}