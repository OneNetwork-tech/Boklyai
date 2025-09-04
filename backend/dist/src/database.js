"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const ChartOfAccounts_1 = require("./ChartOfAccounts");
const Account_1 = require("./Account");
const Transaction_1 = require("./Transaction");
const Company_1 = require("./Company");
const Document_1 = require("./Document");
const Bank_1 = require("./Bank");
const BankAccount_1 = require("./BankAccount");
const BankTransaction_1 = require("./BankTransaction");
const TaxRate_1 = require("./TaxRate");
const TaxRule_1 = require("./TaxRule");
const TaxReport_1 = require("./TaxReport");
const Category_1 = require("./Category");
const TransactionCategory_1 = require("./TransactionCategory");
const CategorizationFeedback_1 = require("./CategorizationFeedback");
const Customer_1 = require("./Customer");
const Vendor_1 = require("./Vendor");
const Invoice_1 = require("./Invoice");
const Bill_1 = require("./Bill");
const InvoiceItem_1 = require("./InvoiceItem");
const BillItem_1 = require("./BillItem");
const FinancialReport_1 = require("./FinancialReport");
const Dashboard_1 = require("./Dashboard");
const Kpi_1 = require("./Kpi");
const Employee_1 = require("./Employee");
const Payroll_1 = require("./Payroll");
const PayrollItem_1 = require("./PayrollItem");
const Role_1 = require("./Role");
const Permission_1 = require("./Permission");
const AuditLog_1 = require("./AuditLog");
// In production, these values should come from environment variables
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'boklyai',
    password: process.env.DB_PASSWORD || 'boklyai_password',
    database: process.env.DB_NAME || 'boklyai_db',
    synchronize: process.env.NODE_ENV !== 'production', // Only for development
    logging: false,
    entities: [
        User_1.User,
        ChartOfAccounts_1.ChartOfAccounts,
        Account_1.Account,
        Transaction_1.Transaction,
        Company_1.Company,
        Document_1.Document,
        Bank_1.Bank,
        BankAccount_1.BankAccount,
        BankTransaction_1.BankTransaction,
        TaxRate_1.TaxRate,
        TaxRule_1.TaxRule,
        TaxReport_1.TaxReport,
        Category_1.Category,
        TransactionCategory_1.TransactionCategory,
        CategorizationFeedback_1.CategorizationFeedback,
        Customer_1.Customer,
        Vendor_1.Vendor,
        Invoice_1.Invoice,
        Bill_1.Bill,
        InvoiceItem_1.InvoiceItem,
        BillItem_1.BillItem,
        FinancialReport_1.FinancialReport,
        Dashboard_1.Dashboard,
        Kpi_1.Kpi,
        Employee_1.Employee,
        Payroll_1.Payroll,
        PayrollItem_1.PayrollItem,
        Role_1.Role,
        Permission_1.Permission,
        AuditLog_1.AuditLog
    ],
    subscribers: [],
    migrations: [],
});
//# sourceMappingURL=database.js.map