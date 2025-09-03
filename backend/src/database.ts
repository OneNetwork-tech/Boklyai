import { DataSource } from 'typeorm';
import { User } from './User';
import { ChartOfAccounts } from './ChartOfAccounts';
import { Account } from './Account';
import { Transaction } from './Transaction';
import { Company } from './Company';
import { Document } from './Document';

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
  entities: [User, ChartOfAccounts, Account, Transaction, Company, Document],
  subscribers: [],
  migrations: [],
});