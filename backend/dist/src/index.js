"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const database_1 = require("./database");
const User_1 = require("./User");
const bankid_service_1 = require("./bankid.service");
const ChartOfAccountsService_1 = require("./ChartOfAccountsService");
const TransactionService_1 = require("./TransactionService");
const CompanyService_1 = require("./CompanyService");
const DocumentService_1 = require("./DocumentService");
const OcrService_1 = require("./OcrService");
const BankService_1 = require("./BankService");
const TaxService_1 = require("./TaxService");
const AICategorizationService_1 = require("./AICategorizationService");
const InvoiceService_1 = require("./InvoiceService");
const BillService_1 = require("./BillService");
const ReportingService_1 = require("./ReportingService");
const PayrollService_1 = require("./PayrollService");
const SecurityService_1 = require("./SecurityService");
const fileUtils_1 = require("./fileUtils");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Configure file upload
const UPLOAD_DIR = process.env.UPLOAD_DIR || path_1.default.join(__dirname, '..', 'uploads');
const upload = (0, multer_1.default)({
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});
// Initialize services
const bankIDService = new bankid_service_1.BankIDService();
const chartOfAccountsService = new ChartOfAccountsService_1.ChartOfAccountsService();
const transactionService = new TransactionService_1.TransactionService();
const companyService = new CompanyService_1.CompanyService();
const documentService = new DocumentService_1.DocumentService();
const ocrService = new OcrService_1.OcrService();
const bankService = new BankService_1.BankService();
const taxService = new TaxService_1.TaxService();
const aiCategorizationService = new AICategorizationService_1.AICategorizationService();
const invoiceService = new InvoiceService_1.InvoiceService();
const billService = new BillService_1.BillService();
const reportingService = new ReportingService_1.ReportingService();
const payrollService = new PayrollService_1.PayrollService();
const securityService = new SecurityService_1.SecurityService();
// Ensure upload directory exists
(0, fileUtils_1.ensureUploadDir)(UPLOAD_DIR).catch(error => {
    console.error('Failed to create upload directory:', error);
});
app.use(express_1.default.json());
// Serve static files from the upload directory
app.use('/uploads', express_1.default.static(UPLOAD_DIR));
// Basic route
app.get('/', (req, res) => {
    res.send('BoklyAI Backend Server - Phase 1 Implementation');
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});
// BankID authentication initiation endpoint
app.post('/auth/initiate', async (req, res) => {
    try {
        const { personalNumber, endUserIp } = req.body;
        // In a real implementation, we would validate the IP address
        const result = await bankIDService.authenticate(personalNumber, endUserIp);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('BankID initiation error:', error);
        res.status(500).json({ error: 'Authentication initiation failed' });
    }
});
// BankID authentication status polling endpoint
app.post('/auth/collect', async (req, res) => {
    try {
        const { orderRef } = req.body;
        if (!orderRef) {
            return res.status(400).json({ error: 'orderRef is required' });
        }
        const result = await bankIDService.collect(orderRef);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('BankID collection error:', error);
        res.status(500).json({ error: 'Authentication collection failed' });
    }
});
// BankID authentication cancellation endpoint
app.post('/auth/cancel', async (req, res) => {
    try {
        const { orderRef } = req.body;
        if (!orderRef) {
            return res.status(400).json({ error: 'orderRef is required' });
        }
        await bankIDService.cancel(orderRef);
        res.status(200).json({ message: 'Authentication cancelled' });
    }
    catch (error) {
        console.error('BankID cancellation error:', error);
        res.status(500).json({ error: 'Authentication cancellation failed' });
    }
});
// Company management endpoints
app.post('/companies', async (req, res) => {
    try {
        const { name, organizationNumber, vatNumber, address, postalCode, city, country } = req.body;
        const company = await companyService.createCompany(name, organizationNumber, vatNumber, address, postalCode, city, country);
        res.status(201).json(company);
    }
    catch (error) {
        console.error('Company creation error:', error);
        res.status(500).json({ error: 'Company creation failed' });
    }
});
app.get('/companies', async (req, res) => {
    try {
        const companies = await companyService.getAllCompanies();
        res.status(200).json(companies);
    }
    catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});
app.get('/companies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const company = await companyService.getCompanyById(id);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.status(200).json(company);
    }
    catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ error: 'Failed to fetch company' });
    }
});
// Chart of Accounts endpoints
app.post('/chart-of-accounts', async (req, res) => {
    try {
        const { name, description, code } = req.body;
        const chartOfAccounts = await chartOfAccountsService.createChartOfAccounts(name, description, code);
        res.status(201).json(chartOfAccounts);
    }
    catch (error) {
        console.error('Chart of accounts creation error:', error);
        res.status(500).json({ error: 'Chart of accounts creation failed' });
    }
});
app.get('/chart-of-accounts', async (req, res) => {
    try {
        const chartsOfAccounts = await chartOfAccountsService.getAllChartsOfAccounts();
        res.status(200).json(chartsOfAccounts);
    }
    catch (error) {
        console.error('Error fetching charts of accounts:', error);
        res.status(500).json({ error: 'Failed to fetch charts of accounts' });
    }
});
app.get('/chart-of-accounts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const chartOfAccounts = await chartOfAccountsService.getChartOfAccountsById(id);
        if (!chartOfAccounts) {
            return res.status(404).json({ error: 'Chart of accounts not found' });
        }
        res.status(200).json(chartOfAccounts);
    }
    catch (error) {
        console.error('Error fetching chart of accounts:', error);
        res.status(500).json({ error: 'Failed to fetch chart of accounts' });
    }
});
// Account endpoints
app.post('/accounts', async (req, res) => {
    try {
        const { chartOfAccountsId, name, description, code, accountType } = req.body;
        const account = await chartOfAccountsService.createAccount(chartOfAccountsId, name, description, code, accountType);
        res.status(201).json(account);
    }
    catch (error) {
        console.error('Account creation error:', error);
        res.status(500).json({ error: 'Account creation failed' });
    }
});
app.get('/chart-of-accounts/:id/accounts', async (req, res) => {
    try {
        const chartOfAccountsId = parseInt(req.params.id);
        const accounts = await chartOfAccountsService.getAccountsByChart(chartOfAccountsId);
        res.status(200).json(accounts);
    }
    catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});
// Transaction endpoints
app.post('/transactions', async (req, res) => {
    try {
        const { accountId, description, transactionDate, amount, type } = req.body;
        const transaction = await transactionService.createTransaction(accountId, description, new Date(transactionDate), amount, type);
        res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Transaction creation error:', error);
        res.status(500).json({ error: 'Transaction creation failed' });
    }
});
app.get('/accounts/:id/transactions', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const transactions = await transactionService.getTransactionsByAccount(accountId);
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// Document management endpoints
app.post('/documents/upload', upload.single('document'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { companyId } = req.body;
        if (!companyId) {
            return res.status(400).json({ error: 'companyId is required' });
        }
        // Generate unique filename
        const filename = (0, fileUtils_1.generateUniqueFilename)(req.file.originalname);
        const filePath = path_1.default.join(UPLOAD_DIR, filename);
        // Save file to disk
        await (0, fileUtils_1.saveFileBuffer)(req.file.buffer, filePath);
        // Create document record
        const document = await documentService.createDocument(parseInt(companyId), filename, req.file.originalname, req.file.mimetype, req.file.size, filePath);
        res.status(201).json(document);
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: 'Document upload failed' });
    }
});
app.get('/companies/:id/documents', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const documents = await documentService.getDocumentsByCompany(companyId);
        res.status(200).json(documents);
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
app.get('/documents/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const document = await documentService.getDocumentById(id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.status(200).json(document);
    }
    catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});
app.delete('/documents/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await documentService.deleteDocument(id);
        res.status(200).json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});
// OCR processing endpoint
app.post('/documents/:id/process-ocr', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Get document
        const document = await documentService.getDocumentById(id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Update status to processing
        await documentService.updateDocumentStatus(id, 'PROCESSING');
        // Get file buffer
        if (!document.filePath) {
            throw new Error('Document file path is missing');
        }
        const fileBuffer = await (0, fileUtils_1.getFileBuffer)(document.filePath);
        // Process with OCR service
        const { text, documentType } = await ocrService.processDocument(document, fileBuffer);
        // Update document with OCR results
        const updatedDocument = await documentService.updateDocumentWithOCR(id, text, documentType);
        res.status(200).json(updatedDocument);
    }
    catch (error) {
        console.error('OCR processing error:', error);
        // Update status to error
        if (req.params.id) {
            const id = parseInt(req.params.id);
            await documentService.updateDocumentStatus(id, 'ERROR');
        }
        res.status(500).json({ error: 'OCR processing failed' });
    }
});
// Bank integration endpoints
app.post('/banks', async (req, res) => {
    try {
        const { name, code, description, apiUrl, authType } = req.body;
        const bank = await bankService.createBank(name, code, description, apiUrl, authType);
        res.status(201).json(bank);
    }
    catch (error) {
        console.error('Bank creation error:', error);
        res.status(500).json({ error: 'Bank creation failed' });
    }
});
app.get('/banks', async (req, res) => {
    try {
        const banks = await bankService.getAllBanks();
        res.status(200).json(banks);
    }
    catch (error) {
        console.error('Error fetching banks:', error);
        res.status(500).json({ error: 'Failed to fetch banks' });
    }
});
app.post('/bank-accounts', async (req, res) => {
    try {
        const { companyId, bankId, accountName, accountNumber, iban, bic } = req.body;
        const bankAccount = await bankService.createBankAccount(companyId, bankId, accountName, accountNumber, iban, bic);
        res.status(201).json(bankAccount);
    }
    catch (error) {
        console.error('Bank account creation error:', error);
        res.status(500).json({ error: 'Bank account creation failed' });
    }
});
app.get('/companies/:id/bank-accounts', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const bankAccounts = await bankService.getBankAccountsByCompany(companyId);
        res.status(200).json(bankAccounts);
    }
    catch (error) {
        console.error('Error fetching bank accounts:', error);
        res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
});
app.post('/bank-accounts/:id/import-transactions', async (req, res) => {
    try {
        const bankAccountId = parseInt(req.params.id);
        const { transactions } = req.body;
        const importedTransactions = await bankService.importBankTransactions(bankAccountId, transactions);
        res.status(201).json(importedTransactions);
    }
    catch (error) {
        console.error('Transaction import error:', error);
        res.status(500).json({ error: 'Transaction import failed' });
    }
});
app.get('/bank-accounts/:id/transactions', async (req, res) => {
    try {
        const bankAccountId = parseInt(req.params.id);
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const transactions = await bankService.getBankTransactions(bankAccountId, limit);
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error('Error fetching bank transactions:', error);
        res.status(500).json({ error: 'Failed to fetch bank transactions' });
    }
});
app.post('/bank-transactions/:id/find-matches', async (req, res) => {
    try {
        const bankTransactionId = parseInt(req.params.id);
        const matches = await bankService.findTransactionMatches(bankTransactionId);
        res.status(200).json(matches);
    }
    catch (error) {
        console.error('Error finding transaction matches:', error);
        res.status(500).json({ error: 'Failed to find transaction matches' });
    }
});
app.post('/bank-transactions/:id/mark-matched', async (req, res) => {
    try {
        const bankTransactionId = parseInt(req.params.id);
        const { matchedTransactionId } = req.body;
        const updatedTransaction = await bankService.markTransactionAsMatched(bankTransactionId, matchedTransactionId);
        res.status(200).json(updatedTransaction);
    }
    catch (error) {
        console.error('Error marking transaction as matched:', error);
        res.status(500).json({ error: 'Failed to mark transaction as matched' });
    }
});
// VAT and Tax endpoints
app.post('/tax-rates', async (req, res) => {
    try {
        const { name, rate, description, isDefault } = req.body;
        const taxRate = await taxService.createTaxRate(name, rate, description, isDefault);
        res.status(201).json(taxRate);
    }
    catch (error) {
        console.error('Tax rate creation error:', error);
        res.status(500).json({ error: 'Tax rate creation failed' });
    }
});
app.get('/tax-rates', async (req, res) => {
    try {
        const taxRates = await taxService.getAllTaxRates();
        res.status(200).json(taxRates);
    }
    catch (error) {
        console.error('Error fetching tax rates:', error);
        res.status(500).json({ error: 'Failed to fetch tax rates' });
    }
});
app.post('/tax-rules', async (req, res) => {
    try {
        const { accountId, taxRateId, name, description, validFrom, validTo } = req.body;
        const taxRule = await taxService.createTaxRule(accountId, taxRateId, name, description, validFrom ? new Date(validFrom) : undefined, validTo ? new Date(validTo) : undefined);
        res.status(201).json(taxRule);
    }
    catch (error) {
        console.error('Tax rule creation error:', error);
        res.status(500).json({ error: 'Tax rule creation failed' });
    }
});
app.post('/tax-calculate', async (req, res) => {
    try {
        const { amount, taxRateId } = req.body;
        const vatAmount = await taxService.calculateVAT(amount, taxRateId);
        res.status(200).json({ amount, taxRateId, vatAmount });
    }
    catch (error) {
        console.error('VAT calculation error:', error);
        res.status(500).json({ error: 'VAT calculation failed' });
    }
});
app.post('/tax-reports', async (req, res) => {
    try {
        const { companyId, name, startDate, endDate, dueDate } = req.body;
        const taxReport = await taxService.createTaxReport(companyId, name, new Date(startDate), new Date(endDate), dueDate ? new Date(dueDate) : undefined);
        res.status(201).json(taxReport);
    }
    catch (error) {
        console.error('Tax report creation error:', error);
        res.status(500).json({ error: 'Tax report creation failed' });
    }
});
app.post('/tax-reports/:id/generate', async (req, res) => {
    try {
        const taxReportId = parseInt(req.params.id);
        const taxReport = await taxService.generateTaxReportData(taxReportId);
        res.status(200).json(taxReport);
    }
    catch (error) {
        console.error('Tax report generation error:', error);
        res.status(500).json({ error: 'Tax report generation failed' });
    }
});
app.get('/companies/:id/tax-reports', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const taxReports = await taxService.getTaxReportsByCompany(companyId);
        res.status(200).json(taxReports);
    }
    catch (error) {
        console.error('Error fetching tax reports:', error);
        res.status(500).json({ error: 'Failed to fetch tax reports' });
    }
});
app.post('/tax-reports/:id/submit', async (req, res) => {
    try {
        const taxReportId = parseInt(req.params.id);
        const taxReport = await taxService.submitTaxReport(taxReportId);
        res.status(200).json(taxReport);
    }
    catch (error) {
        console.error('Tax report submission error:', error);
        res.status(500).json({ error: 'Tax report submission failed' });
    }
});
// AI Categorization endpoints
app.post('/categories', async (req, res) => {
    try {
        const { name, code, type, description, parentId } = req.body;
        const category = await aiCategorizationService.createCategory(name, code, type, description, parentId);
        res.status(201).json(category);
    }
    catch (error) {
        console.error('Category creation error:', error);
        res.status(500).json({ error: 'Category creation failed' });
    }
});
app.get('/categories', async (req, res) => {
    try {
        const categories = await aiCategorizationService.getAllCategories();
        res.status(200).json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
app.post('/transactions/:id/categorize', async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const transactionCategory = await aiCategorizationService.categorizeTransaction(transactionId);
        res.status(200).json(transactionCategory);
    }
    catch (error) {
        console.error('Transaction categorization error:', error);
        res.status(500).json({ error: 'Transaction categorization failed' });
    }
});
app.post('/transactions/:id/categorize-manual', async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const { categoryId, userId } = req.body;
        if (!categoryId || !userId) {
            return res.status(400).json({ error: 'categoryId and userId are required' });
        }
        const transactionCategory = await aiCategorizationService.manuallyCategorizeTransaction(transactionId, categoryId, userId);
        res.status(200).json(transactionCategory);
    }
    catch (error) {
        console.error('Manual transaction categorization error:', error);
        res.status(500).json({ error: 'Manual transaction categorization failed' });
    }
});
app.get('/transactions/:id/categories', async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const categories = await aiCategorizationService.getTransactionCategories(transactionId);
        res.status(200).json(categories);
    }
    catch (error) {
        console.error('Error fetching transaction categories:', error);
        res.status(500).json({ error: 'Failed to fetch transaction categories' });
    }
});
app.post('/ai/retrain', async (req, res) => {
    try {
        const result = await aiCategorizationService.retrainModel();
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Model retraining error:', error);
        res.status(500).json({ error: 'Model retraining failed' });
    }
});
// Invoicing and AR/AP endpoints
app.post('/customers', async (req, res) => {
    try {
        const { name, organizationNumber, vatNumber, contactPerson, email, phone, address, postalCode, city, country, notes } = req.body;
        const customer = await invoiceService.createCustomer(name, organizationNumber, vatNumber, contactPerson, email, phone, address, postalCode, city, country, notes);
        res.status(201).json(customer);
    }
    catch (error) {
        console.error('Customer creation error:', error);
        res.status(500).json({ error: 'Customer creation failed' });
    }
});
app.get('/customers', async (req, res) => {
    try {
        const customers = await invoiceService.getAllCustomers();
        res.status(200).json(custompanies);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});
app.post('/invoices', async (req, res) => {
    try {
        const { companyId, customerId, invoiceNumber, invoiceDate, dueDate, reference, notes, isEInvoice } = req.body;
        const invoice = await invoiceService.createInvoice(companyId, customerId, invoiceNumber, new Date(invoiceDate), new Date(dueDate), reference, notes, isEInvoice);
        res.status(201).json(invoice);
    }
    catch (error) {
        console.error('Invoice creation error:', error);
        res.status(500).json({ error: 'Invoice creation failed' });
    }
});
app.get('/companies/:id/invoices', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const invoices = await invoiceService.getInvoicesByCompany(companyId);
        res.status(200).json(invoices);
    }
    catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});
app.post('/invoices/:id/items', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        const { description, quantity, unitPrice, taxRate, accountId } = req.body;
        const invoiceItem = await invoiceService.addInvoiceItem(invoiceId, description, quantity, unitPrice, taxRate, accountId);
        res.status(201).json(invoiceItem);
    }
    catch (error) {
        console.error('Invoice item creation error:', error);
        res.status(500).json({ error: 'Invoice item creation failed' });
    }
});
app.post('/invoices/:id/status', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        const { status } = req.body;
        const invoice = await invoiceService.updateInvoiceStatus(invoiceId, status);
        res.status(200).json(invoice);
    }
    catch (error) {
        console.error('Invoice status update error:', error);
        res.status(500).json({ error: 'Invoice status update failed' });
    }
});
app.post('/vendors', async (req, res) => {
    try {
        const { name, organizationNumber, vatNumber, contactPerson, email, phone, address, postalCode, city, country, notes } = req.body;
        const vendor = await billService.createVendor(name, organizationNumber, vatNumber, contactPerson, email, phone, address, postalCode, city, country, notes);
        res.status(201).json(vendor);
    }
    catch (error) {
        console.error('Vendor creation error:', error);
        res.status(500).json({ error: 'Vendor creation failed' });
    }
});
app.get('/vendors', async (req, res) => {
    try {
        const vendors = await billService.getAllVendors();
        res.status(200).json(vendors);
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});
app.post('/bills', async (req, res) => {
    try {
        const { companyId, vendorId, billNumber, billDate, dueDate, reference, notes } = req.body;
        const bill = await billService.createBill(companyId, vendorId, billNumber, new Date(billDate), new Date(dueDate), reference, notes);
        res.status(201).json(bill);
    }
    catch (error) {
        console.error('Bill creation error:', error);
        res.status(500).json({ error: 'Bill creation failed' });
    }
});
app.get('/companies/:id/bills', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const bills = await billService.getBillsByCompany(companyId);
        res.status(200).json(bills);
    }
    catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});
app.post('/bills/:id/items', async (req, res) => {
    try {
        const billId = parseInt(req.params.id);
        const { description, quantity, unitPrice, taxRate, accountId } = req.body;
        const billItem = await billService.addBillItem(billId, description, quantity, unitPrice, taxRate, accountId);
        res.status(201).json(billItem);
    }
    catch (error) {
        console.error('Bill item creation error:', error);
        res.status(500).json({ error: 'Bill item creation failed' });
    }
});
app.post('/bills/:id/status', async (req, res) => {
    try {
        const billId = parseInt(req.params.id);
        const { status } = req.body;
        const bill = await billService.updateBillStatus(billId, status);
        res.status(200).json(bill);
    }
    catch (error) {
        console.error('Bill status update error:', error);
        res.status(500).json({ error: 'Bill status update failed' });
    }
});
// Reporting and Dashboard endpoints
app.post('/financial-reports', async (req, res) => {
    try {
        const { companyId, name, type, startDate, endDate, description } = req.body;
        const financialReport = await reportingService.createFinancialReport(companyId, name, type, new Date(startDate), new Date(endDate), description);
        res.status(201).json(financialReport);
    }
    catch (error) {
        console.error('Financial report creation error:', error);
        res.status(500).json({ error: 'Financial report creation failed' });
    }
});
app.get('/companies/:id/financial-reports', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const financialReports = await reportingService.getFinancialReportsByCompany(companyId);
        res.status(200).json(financialReports);
    }
    catch (error) {
        console.error('Error fetching financial reports:', error);
        res.status(500).json({ error: 'Failed to fetch financial reports' });
    }
});
app.post('/financial-reports/:id/generate', async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        const financialReport = await reportingService.generateFinancialReportData(reportId);
        res.status(200).json(financialReport);
    }
    catch (error) {
        console.error('Financial report generation error:', error);
        res.status(500).json({ error: 'Financial report generation failed' });
    }
});
app.post('/dashboards', async (req, res) => {
    try {
        const { companyId, name, description } = req.body;
        const dashboard = await reportingService.createDashboard(companyId, name, description);
        res.status(201).json(dashboard);
    }
    catch (error) {
        console.error('Dashboard creation error:', error);
        res.status(500).json({ error: 'Dashboard creation failed' });
    }
});
app.get('/companies/:id/dashboards', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const dashboards = await reportingService.getDashboardsByCompany(companyId);
        res.status(200).json(dashboards);
    }
    catch (error) {
        console.error('Error fetching dashboards:', error);
        res.status(500).json({ error: 'Failed to fetch dashboards' });
    }
});
app.post('/dashboards/:id/layout', async (req, res) => {
    try {
        const dashboardId = parseInt(req.params.id);
        const { layout } = req.body;
        const dashboard = await reportingService.updateDashboardLayout(dashboardId, layout);
        res.status(200).json(dashboard);
    }
    catch (error) {
        console.error('Dashboard layout update error:', error);
        res.status(500).json({ error: 'Dashboard layout update failed' });
    }
});
app.post('/dashboards/:id/kpi-config', async (req, res) => {
    try {
        const dashboardId = parseInt(req.params.id);
        const { kpiConfig } = req.body;
        const dashboard = await reportingService.updateDashboardKpiConfig(dashboardId, kpiConfig);
        res.status(200).json(dashboard);
    }
    catch (error) {
        console.error('Dashboard KPI config update error:', error);
        res.status(500).json({ error: 'Dashboard KPI config update failed' });
    }
});
app.post('/kpis', async (req, res) => {
    try {
        const { companyId, name, code, description, unit, category } = req.body;
        const kpi = await reportingService.createKpi(companyId, name, code, description, unit, category);
        res.status(201).json(kpi);
    }
    catch (error) {
        console.error('KPI creation error:', error);
        res.status(500).json({ error: 'KPI creation failed' });
    }
});
app.get('/companies/:id/kpis', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const kpis = await reportingService.getKpisByCompany(companyId);
        res.status(200).json(kpis);
    }
    catch (error) {
        console.error('Error fetching KPIs:', error);
        res.status(500).json({ error: 'Failed to fetch KPIs' });
    }
});
app.post('/kpis/:id/values', async (req, res) => {
    try {
        const kpiId = parseInt(req.params.id);
        const { currentValue, previousValue, targetValue } = req.body;
        const kpi = await reportingService.updateKpiValues(kpiId, currentValue, previousValue, targetValue);
        res.status(200).json(kpi);
    }
    catch (error) {
        console.error('KPI values update error:', error);
        res.status(500).json({ error: 'KPI values update failed' });
    }
});
app.get('/companies/:id/swedish-kpis', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const kpis = await reportingService.calculateSwedishBusinessKpis(companyId);
        res.status(200).json(kpis);
    }
    catch (error) {
        console.error('Error calculating Swedish KPIs:', error);
        res.status(500).json({ error: 'Failed to calculate Swedish KPIs' });
    }
});
// Payroll endpoints
app.post('/employees', async (req, res) => {
    try {
        const { companyId, firstName, lastName, personalNumber, email, phone, address, postalCode, city, country, startDate, salary, position, notes } = req.body;
        const employee = await payrollService.createEmployee(companyId, firstName, lastName, personalNumber, email, phone, address, postalCode, city, country, startDate ? new Date(startDate) : undefined, salary, position, notes);
        res.status(201).json(employee);
    }
    catch (error) {
        console.error('Employee creation error:', error);
        res.status(500).json({ error: 'Employee creation failed' });
    }
});
app.get('/companies/:id/employees', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const employees = await payrollService.getEmployeesByCompany(companyId);
        res.status(200).json(employees);
    }
    catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
app.post('/employees/:id/status', async (req, res) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { status } = req.body;
        const employee = await payrollService.updateEmployeeStatus(employeeId, status);
        res.status(200).json(employee);
    }
    catch (error) {
        console.error('Employee status update error:', error);
        res.status(500).json({ error: 'Employee status update failed' });
    }
});
app.post('/payrolls', async (req, res) => {
    try {
        const { companyId, name, periodStart, periodEnd, paymentDate } = req.body;
        const payroll = await payrollService.createPayroll(companyId, name, new Date(periodStart), new Date(periodEnd), new Date(paymentDate));
        res.status(201).json(payroll);
    }
    catch (error) {
        console.error('Payroll creation error:', error);
        res.status(500).json({ error: 'Payroll creation failed' });
    }
});
app.get('/companies/:id/payrolls', async (req, res) => {
    try {
        const companyId = parseInt(req.params.id);
        const payrolls = await payrollService.getPayrollsByCompany(companyId);
        res.status(200).json(payrolls);
    }
    catch (error) {
        console.error('Error fetching payrolls:', error);
        res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
});
app.post('/payrolls/:id/status', async (req, res) => {
    try {
        const payrollId = parseInt(req.params.id);
        const { status } = req.body;
        const payroll = await payrollService.updatePayrollStatus(payrollId, status);
        res.status(200).json(payroll);
    }
    catch (error) {
        console.error('Payroll status update error:', error);
        res.status(500).json({ error: 'Payroll status update failed' });
    }
});
app.post('/payrolls/:id/items', async (req, res) => {
    try {
        const payrollId = parseInt(req.params.id);
        const { employeeId, grossSalary, preTaxDeductions, postTaxDeductions } = req.body;
        const payrollItem = await payrollService.addEmployeeToPayroll(payrollId, employeeId, grossSalary, preTaxDeductions, postTaxDeductions);
        res.status(201).json(payrollItem);
    }
    catch (error) {
        console.error('Payroll item creation error:', error);
        res.status(500).json({ error: 'Payroll item creation failed' });
    }
});
app.post('/payrolls/:id/generate', async (req, res) => {
    try {
        const payrollId = parseInt(req.params.id);
        const payroll = await payrollService.generatePayrollData(payrollId);
        res.status(200).json(payroll);
    }
    catch (error) {
        console.error('Payroll data generation error:', error);
        res.status(500).json({ error: 'Payroll data generation failed' });
    }
});
// Security endpoints
app.post('/roles', async (req, res) => {
    try {
        const { name, description } = req.body;
        const role = await securityService.createRole(name, description);
        res.status(201).json(role);
    }
    catch (error) {
        console.error('Role creation error:', error);
        res.status(500).json({ error: 'Role creation failed' });
    }
});
app.get('/roles', async (req, res) => {
    try {
        const roles = await securityService.getAllRoles();
        res.status(200).json(roles);
    }
    catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});
app.post('/permissions', async (req, res) => {
    try {
        const { name, code, description } = req.body;
        const permission = await securityService.createPermission(name, code, description);
        res.status(201).json(permission);
    }
    catch (error) {
        console.error('Permission creation error:', error);
        res.status(500).json({ error: 'Permission creation failed' });
    }
});
app.get('/permissions', async (req, res) => {
    try {
        const permissions = await securityService.getAllPermissions();
        res.status(200).json(permissions);
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});
app.post('/roles/:id/permissions', async (req, res) => {
    try {
        const roleId = parseInt(req.params.id);
        const { permissionIds } = req.body;
        const role = await securityService.assignPermissionsToRole(roleId, permissionIds);
        res.status(200).json(role);
    }
    catch (error) {
        console.error('Permission assignment error:', error);
        res.status(500).json({ error: 'Permission assignment failed' });
    }
});
app.post('/users/:id/role', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { roleId } = req.body;
        const user = await securityService.assignRoleToUser(userId, roleId);
        res.status(200).json(user);
    }
    catch (error) {
        console.error('Role assignment error:', error);
        res.status(500).json({ error: 'Role assignment failed' });
    }
});
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await securityService.authenticateUser(email, password);
        if (!result) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});
app.post('/auth/reset-password/request', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const token = await securityService.generatePasswordResetToken(email);
        if (!token) {
            // We don't reveal if the email exists or not for security reasons
            return res.status(200).json({ message: 'If the email exists, a reset link has been sent' });
        }
        // In a real implementation, you would send an email with the reset token
        // For now, we just return the token (which should never be done in production)
        res.status(200).json({ token });
    }
    catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Password reset request failed' });
    }
});
app.post('/auth/reset-password/confirm', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        const success = await securityService.resetUserPassword(token, newPassword);
        if (!success) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        res.status(200).json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});
// Simple user registration endpoint (will be expanded with BankID in later phases)
app.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Check if user already exists
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        // Create new user
        const user = new User_1.User();
        user.email = email;
        user.password = password; // In production, this should be hashed
        user.firstName = firstName;
        user.lastName = lastName;
        await userRepository.save(user);
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});
// Database connection
const connectDB = async () => {
    try {
        await database_1.AppDataSource.initialize();
        console.log('Database connection established');
    }
    catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};
//# sourceMappingURL=index.js.map