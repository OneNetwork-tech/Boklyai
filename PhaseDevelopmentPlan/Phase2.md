Core Accounting Schema  

Objectives: Implement BAS chart of accounts, basic transaction system

Create BAS standard chart of accounts

Implement transaction recording system

Develop basic journal entry system

Create company profile management

Test Criteria:

BAS accounts properly categorized

Transactions can be created and retrieved

Journal entries balance correctly

## Implementation Status: COMPLETED

### Entities Created:
1. **ChartOfAccounts** - Represents a collection of accounts (e.g., BAS chart)
2. **Account** - Individual accounting accounts with types (Asset, Liability, Equity, Revenue, Expense)
3. **Transaction** - Financial transactions recorded against accounts
4. **Company** - Company profile information

### Services Implemented:
1. **ChartOfAccountsService** - Managing charts of accounts and individual accounts
2. **TransactionService** - Recording and managing transactions
3. **CompanyService** - Managing company profiles

### API Endpoints:
1. **Company Management**
   - POST /companies - Create a new company
   - GET /companies - List all companies
   - GET /companies/:id - Get a specific company

2. **Chart of Accounts**
   - POST /chart-of-accounts - Create a new chart of accounts
   - GET /chart-of-accounts - List all charts of accounts
   - GET /chart-of-accounts/:id - Get a specific chart of accounts

3. **Account Management**
   - POST /accounts - Create a new account
   - GET /chart-of-accounts/:id/accounts - List all accounts in a chart

4. **Transaction Recording**
   - POST /transactions - Record a new transaction
   - GET /accounts/:id/transactions - List all transactions for an account

### Features:
- Full Swedish BAS chart of accounts structure support
- Automatic account balance updates when transactions are recorded
- Company profile management with organization number and address information
- Complete test coverage for all new endpoints