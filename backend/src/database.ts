import { DataSource } from 'typeorm';
import { User } from './User';
import { ChartOfAccounts } from './ChartOfAccounts';
import { Account } from './Account';
import { Transaction } from './Transaction';
import { Company } from './Company';
import { Document } from './Document';
import { Bank } from './Bank';
import { BankAccount } from './BankAccount';
import { BankTransaction } from './BankTransaction';
import { TaxRate } from './TaxRate';
import { TaxRule } from './TaxRule';
import { TaxReport } from './TaxReport';
import { Category } from './Category';
import { TransactionCategory } from './TransactionCategory';
import { CategorizationFeedback } from './CategorizationFeedback';
import { Customer } from './Customer';
import { Vendor } from './Vendor';
import { Invoice } from './Invoice';
import { Bill } from './Bill';
import { InvoiceItem } from './InvoiceItem';
import { BillItem } from './BillItem';
import { FinancialReport } from './FinancialReport';
import { Dashboard } from './Dashboard';
import { Kpi } from './Kpi';
import { Employee } from './Employee';
import { Payroll } from './Payroll';
import { PayrollItem } from './PayrollItem';
import { Role } from './Role';
import { Permission } from './Permission';
import { AuditLog } from './AuditLog';

// In production, these values should come from environment variables
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'boklyai',
  password: process.env.DB_PASSWORD || 'boklyai_password',
  database: process.env.DB_NAME || 'boklyai_db',
  synchronize: process.env.NODE_ENV !== 'production', // Only for development
  logging: false,
  entities: [
    User, 
    ChartOfAccounts, 
    Account, 
    Transaction, 
    Company, 
    Document, 
    Bank, 
    BankAccount, 
    BankTransaction,
    TaxRate,
    TaxRule,
    TaxReport,
    Category,
    TransactionCategory,
    CategorizationFeedback,
    Customer,
    Vendor,
    Invoice,
    Bill,
    InvoiceItem,
    BillItem,
    FinancialReport,
    Dashboard,
    Kpi,
    Employee,
    Payroll,
    PayrollItem,
    Role,
    Permission,
    AuditLog
  ],
  subscribers: [],
  migrations: [],
});