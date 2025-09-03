import express, { Application, Request, Response } from 'express';
import multer from 'multer';
import { AppDataSource } from './database';
import { User } from './User';
import { BankIDService } from './bankid.service';
import { ChartOfAccountsService } from './ChartOfAccountsService';
import { TransactionService } from './TransactionService';
import { CompanyService } from './CompanyService';
import { DocumentService } from './DocumentService';
import { OcrService } from './OcrService';
import { BankService } from './BankService';
import { TaxService } from './TaxService';
import { AICategorizationService } from './AICategorizationService';
import { InvoiceService } from './InvoiceService';
import { BillService } from './BillService';
import { generateUniqueFilename, ensureUploadDir, saveFileBuffer, getFileBuffer } from './fileUtils';
import path from 'path';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Configure file upload
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const upload = multer({ 
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize services
const bankIDService = new BankIDService();
const chartOfAccountsService = new ChartOfAccountsService();
const transactionService = new TransactionService();
const companyService = new CompanyService();
const documentService = new DocumentService();
const ocrService = new OcrService();
const bankService = new BankService();
const taxService = new TaxService();
const aiCategorizationService = new AICategorizationService();
const invoiceService = new InvoiceService();
const billService = new BillService();

// Ensure upload directory exists
ensureUploadDir(UPLOAD_DIR).catch(error => {
  console.error('Failed to create upload directory:', error);
});

app.use(express.json());

// Serve static files from the upload directory
app.use('/uploads', express.static(UPLOAD_DIR));

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('BoklyAI Backend Server - Phase 1 Implementation');
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// BankID authentication initiation endpoint
app.post('/auth/initiate', async (req: Request, res: Response) => {
  try {
    const { personalNumber, endUserIp } = req.body;
    
    // In a real implementation, we would validate the IP address
    const result = await bankIDService.authenticate(personalNumber, endUserIp);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('BankID initiation error:', error);
    res.status(500).json({ error: 'Authentication initiation failed' });
  }
});

// BankID authentication status polling endpoint
app.post('/auth/collect', async (req: Request, res: Response) => {
  try {
    const { orderRef } = req.body;
    
    if (!orderRef) {
      return res.status(400).json({ error: 'orderRef is required' });
    }
    
    const result = await bankIDService.collect(orderRef);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('BankID collection error:', error);
    res.status(500).json({ error: 'Authentication collection failed' });
  }
});

// BankID authentication cancellation endpoint
app.post('/auth/cancel', async (req: Request, res: Response) => {
  try {
    const { orderRef } = req.body;
    
    if (!orderRef) {
      return res.status(400).json({ error: 'orderRef is required' });
    }
    
    await bankIDService.cancel(orderRef);
    
    res.status(200).json({ message: 'Authentication cancelled' });
  } catch (error) {
    console.error('BankID cancellation error:', error);
    res.status(500).json({ error: 'Authentication cancellation failed' });
  }
});

// Company management endpoints
app.post('/companies', async (req: Request, res: Response) => {
  try {
    const { name, organizationNumber, vatNumber, address, postalCode, city, country } = req.body;
    const company = await companyService.createCompany(
      name,
      organizationNumber,
      vatNumber,
      address,
      postalCode,
      city,
      country
    );
    res.status(201).json(company);
  } catch (error) {
    console.error('Company creation error:', error);
    res.status(500).json({ error: 'Company creation failed' });
  }
});

app.get('/companies', async (req: Request, res: Response) => {
  try {
    const companies = await companyService.getAllCompanies();
    res.status(200).json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.get('/companies/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const company = await companyService.getCompanyById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.status(200).json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Chart of Accounts endpoints
app.post('/chart-of-accounts', async (req: Request, res: Response) => {
  try {
    const { name, description, code } = req.body;
    const chartOfAccounts = await chartOfAccountsService.createChartOfAccounts(name, description, code);
    res.status(201).json(chartOfAccounts);
  } catch (error) {
    console.error('Chart of accounts creation error:', error);
    res.status(500).json({ error: 'Chart of accounts creation failed' });
  }
});

app.get('/chart-of-accounts', async (req: Request, res: Response) => {
  try {
    const chartsOfAccounts = await chartOfAccountsService.getAllChartsOfAccounts();
    res.status(200).json(chartsOfAccounts);
  } catch (error) {
    console.error('Error fetching charts of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch charts of accounts' });
  }
});

app.get('/chart-of-accounts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const chartOfAccounts = await chartOfAccountsService.getChartOfAccountsById(id);
    if (!chartOfAccounts) {
      return res.status(404).json({ error: 'Chart of accounts not found' });
    }
    res.status(200).json(chartOfAccounts);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

// Account endpoints
app.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { chartOfAccountsId, name, description, code, accountType } = req.body;
    const account = await chartOfAccountsService.createAccount(
      chartOfAccountsId,
      name,
      description,
      code,
      accountType
    );
    res.status(201).json(account);
  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({ error: 'Account creation failed' });
  }
});

app.get('/chart-of-accounts/:id/accounts', async (req: Request, res: Response) => {
  try {
    const chartOfAccountsId = parseInt(req.params.id);
    const accounts = await chartOfAccountsService.getAccountsByChart(chartOfAccountsId);
    res.status(200).json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Transaction endpoints
app.post('/transactions', async (req: Request, res: Response) => {
  try {
    const { accountId, description, transactionDate, amount, type } = req.body;
    const transaction = await transactionService.createTransaction(
      accountId,
      description,
      new Date(transactionDate),
      amount,
      type
    );
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({ error: 'Transaction creation failed' });
  }
});

app.get('/accounts/:id/transactions', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    const transactions = await transactionService.getTransactionsByAccount(accountId);
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Document management endpoints
app.post('/documents/upload', upload.single('document'), async (req: Request, res: Response) => {
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
    const filename = generateUniqueFilename(req.file.originalname);
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save file to disk
    await saveFileBuffer(req.file.buffer, filePath);

    // Create document record
    const document = await documentService.createDocument(
      parseInt(companyId),
      filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      filePath
    );

    res.status(201).json(document);
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Document upload failed' });
  }
});

app.get('/companies/:id/documents', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const documents = await documentService.getDocumentsByCompany(companyId);
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/documents/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const document = await documentService.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(200).json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

app.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await documentService.deleteDocument(id);
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// OCR processing endpoint
app.post('/documents/:id/process-ocr', async (req: Request, res: Response) => {
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
    
    const fileBuffer = await getFileBuffer(document.filePath);
    
    // Process with OCR service
    const { text, documentType } = await ocrService.processDocument(document, fileBuffer);
    
    // Update document with OCR results
    const updatedDocument = await documentService.updateDocumentWithOCR(id, text, documentType);
    
    res.status(200).json(updatedDocument);
  } catch (error) {
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
app.post('/banks', async (req: Request, res: Response) => {
  try {
    const { name, code, description, apiUrl, authType } = req.body;
    const bank = await bankService.createBank(name, code, description, apiUrl, authType);
    res.status(201).json(bank);
  } catch (error) {
    console.error('Bank creation error:', error);
    res.status(500).json({ error: 'Bank creation failed' });
  }
});

app.get('/banks', async (req: Request, res: Response) => {
  try {
    const banks = await bankService.getAllBanks();
    res.status(200).json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

app.post('/bank-accounts', async (req: Request, res: Response) => {
  try {
    const { companyId, bankId, accountName, accountNumber, iban, bic } = req.body;
    const bankAccount = await bankService.createBankAccount(
      companyId,
      bankId,
      accountName,
      accountNumber,
      iban,
      bic
    );
    res.status(201).json(bankAccount);
  } catch (error) {
    console.error('Bank account creation error:', error);
    res.status(500).json({ error: 'Bank account creation failed' });
  }
});

app.get('/companies/:id/bank-accounts', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const bankAccounts = await bankService.getBankAccountsByCompany(companyId);
    res.status(200).json(bankAccounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

app.post('/bank-accounts/:id/import-transactions', async (req: Request, res: Response) => {
  try {
    const bankAccountId = parseInt(req.params.id);
    const { transactions } = req.body;
    
    const importedTransactions = await bankService.importBankTransactions(bankAccountId, transactions);
    res.status(201).json(importedTransactions);
  } catch (error) {
    console.error('Transaction import error:', error);
    res.status(500).json({ error: 'Transaction import failed' });
  }
});

app.get('/bank-accounts/:id/transactions', async (req: Request, res: Response) => {
  try {
    const bankAccountId = parseInt(req.params.id);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const transactions = await bankService.getBankTransactions(bankAccountId, limit);
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    res.status(500).json({ error: 'Failed to fetch bank transactions' });
  }
});

app.post('/bank-transactions/:id/find-matches', async (req: Request, res: Response) => {
  try {
    const bankTransactionId = parseInt(req.params.id);
    const matches = await bankService.findTransactionMatches(bankTransactionId);
    res.status(200).json(matches);
  } catch (error) {
    console.error('Error finding transaction matches:', error);
    res.status(500).json({ error: 'Failed to find transaction matches' });
  }
});

app.post('/bank-transactions/:id/mark-matched', async (req: Request, res: Response) => {
  try {
    const bankTransactionId = parseInt(req.params.id);
    const { matchedTransactionId } = req.body;
    
    const updatedTransaction = await bankService.markTransactionAsMatched(bankTransactionId, matchedTransactionId);
    res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error('Error marking transaction as matched:', error);
    res.status(500).json({ error: 'Failed to mark transaction as matched' });
  }
});

// VAT and Tax endpoints
app.post('/tax-rates', async (req: Request, res: Response) => {
  try {
    const { name, rate, description, isDefault } = req.body;
    const taxRate = await taxService.createTaxRate(name, rate, description, isDefault);
    res.status(201).json(taxRate);
  } catch (error) {
    console.error('Tax rate creation error:', error);
    res.status(500).json({ error: 'Tax rate creation failed' });
  }
});

app.get('/tax-rates', async (req: Request, res: Response) => {
  try {
    const taxRates = await taxService.getAllTaxRates();
    res.status(200).json(taxRates);
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    res.status(500).json({ error: 'Failed to fetch tax rates' });
  }
});

app.post('/tax-rules', async (req: Request, res: Response) => {
  try {
    const { accountId, taxRateId, name, description, validFrom, validTo } = req.body;
    const taxRule = await taxService.createTaxRule(
      accountId,
      taxRateId,
      name,
      description,
      validFrom ? new Date(validFrom) : undefined,
      validTo ? new Date(validTo) : undefined
    );
    res.status(201).json(taxRule);
  } catch (error) {
    console.error('Tax rule creation error:', error);
    res.status(500).json({ error: 'Tax rule creation failed' });
  }
});

app.post('/tax-calculate', async (req: Request, res: Response) => {
  try {
    const { amount, taxRateId } = req.body;
    const vatAmount = await taxService.calculateVAT(amount, taxRateId);
    res.status(200).json({ amount, taxRateId, vatAmount });
  } catch (error) {
    console.error('VAT calculation error:', error);
    res.status(500).json({ error: 'VAT calculation failed' });
  }
});

app.post('/tax-reports', async (req: Request, res: Response) => {
  try {
    const { companyId, name, startDate, endDate, dueDate } = req.body;
    const taxReport = await taxService.createTaxReport(
      companyId,
      name,
      new Date(startDate),
      new Date(endDate),
      dueDate ? new Date(dueDate) : undefined
    );
    res.status(201).json(taxReport);
  } catch (error) {
    console.error('Tax report creation error:', error);
    res.status(500).json({ error: 'Tax report creation failed' });
  }
});

app.post('/tax-reports/:id/generate', async (req: Request, res: Response) => {
  try {
    const taxReportId = parseInt(req.params.id);
    const taxReport = await taxService.generateTaxReportData(taxReportId);
    res.status(200).json(taxReport);
  } catch (error) {
    console.error('Tax report generation error:', error);
    res.status(500).json({ error: 'Tax report generation failed' });
  }
});

app.get('/companies/:id/tax-reports', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const taxReports = await taxService.getTaxReportsByCompany(companyId);
    res.status(200).json(taxReports);
  } catch (error) {
    console.error('Error fetching tax reports:', error);
    res.status(500).json({ error: 'Failed to fetch tax reports' });
  }
});

app.post('/tax-reports/:id/submit', async (req: Request, res: Response) => {
  try {
    const taxReportId = parseInt(req.params.id);
    const taxReport = await taxService.submitTaxReport(taxReportId);
    res.status(200).json(taxReport);
  } catch (error) {
    console.error('Tax report submission error:', error);
    res.status(500).json({ error: 'Tax report submission failed' });
  }
});

// AI Categorization endpoints
app.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name, code, type, description, parentId } = req.body;
    const category = await aiCategorizationService.createCategory(name, code, type, description, parentId);
    res.status(201).json(category);
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ error: 'Category creation failed' });
  }
});

app.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await aiCategorizationService.getAllCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/transactions/:id/categorize', async (req: Request, res: Response) => {
  try {
    const transactionId = parseInt(req.params.id);
    const transactionCategory = await aiCategorizationService.categorizeTransaction(transactionId);
    res.status(200).json(transactionCategory);
  } catch (error) {
    console.error('Transaction categorization error:', error);
    res.status(500).json({ error: 'Transaction categorization failed' });
  }
});

app.post('/transactions/:id/categorize-manual', async (req: Request, res: Response) => {
  try {
    const transactionId = parseInt(req.params.id);
    const { categoryId, userId } = req.body;
    
    if (!categoryId || !userId) {
      return res.status(400).json({ error: 'categoryId and userId are required' });
    }
    
    const transactionCategory = await aiCategorizationService.manuallyCategorizeTransaction(
      transactionId,
      categoryId,
      userId
    );
    res.status(200).json(transactionCategory);
  } catch (error) {
    console.error('Manual transaction categorization error:', error);
    res.status(500).json({ error: 'Manual transaction categorization failed' });
  }
});

app.get('/transactions/:id/categories', async (req: Request, res: Response) => {
  try {
    const transactionId = parseInt(req.params.id);
    const categories = await aiCategorizationService.getTransactionCategories(transactionId);
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching transaction categories:', error);
    res.status(500).json({ error: 'Failed to fetch transaction categories' });
  }
});

app.post('/ai/retrain', async (req: Request, res: Response) => {
  try {
    const result = await aiCategorizationService.retrainModel();
    res.status(200).json(result);
  } catch (error) {
    console.error('Model retraining error:', error);
    res.status(500).json({ error: 'Model retraining failed' });
  }
});

// Invoicing and AR/AP endpoints
app.post('/customers', async (req: Request, res: Response) => {
  try {
    const { name, organizationNumber, vatNumber, contactPerson, email, phone, address, postalCode, city, country, notes } = req.body;
    const customer = await invoiceService.createCustomer(
      name,
      organizationNumber,
      vatNumber,
      contactPerson,
      email,
      phone,
      address,
      postalCode,
      city,
      country,
      notes
    );
    res.status(201).json(customer);
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({ error: 'Customer creation failed' });
  }
});

app.get('/customers', async (req: Request, res: Response) => {
  try {
    const customers = await invoiceService.getAllCustomers();
    res.status(200).json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.post('/invoices', async (req: Request, res: Response) => {
  try {
    const { companyId, customerId, invoiceNumber, invoiceDate, dueDate, reference, notes, isEInvoice } = req.body;
    const invoice = await invoiceService.createInvoice(
      companyId,
      customerId,
      invoiceNumber,
      new Date(invoiceDate),
      new Date(dueDate),
      reference,
      notes,
      isEInvoice
    );
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(500).json({ error: 'Invoice creation failed' });
  }
});

app.get('/companies/:id/invoices', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const invoices = await invoiceService.getInvoicesByCompany(companyId);
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

app.post('/invoices/:id/items', async (req: Request, res: Response) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { description, quantity, unitPrice, taxRate, accountId } = req.body;
    const invoiceItem = await invoiceService.addInvoiceItem(
      invoiceId,
      description,
      quantity,
      unitPrice,
      taxRate,
      accountId
    );
    res.status(201).json(invoiceItem);
  } catch (error) {
    console.error('Invoice item creation error:', error);
    res.status(500).json({ error: 'Invoice item creation failed' });
  }
});

app.post('/invoices/:id/status', async (req: Request, res: Response) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { status } = req.body;
    const invoice = await invoiceService.updateInvoiceStatus(invoiceId, status);
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Invoice status update error:', error);
    res.status(500).json({ error: 'Invoice status update failed' });
  }
});

app.post('/vendors', async (req: Request, res: Response) => {
  try {
    const { name, organizationNumber, vatNumber, contactPerson, email, phone, address, postalCode, city, country, notes } = req.body;
    const vendor = await billService.createVendor(
      name,
      organizationNumber,
      vatNumber,
      contactPerson,
      email,
      phone,
      address,
      postalCode,
      city,
      country,
      notes
    );
    res.status(201).json(vendor);
  } catch (error) {
    console.error('Vendor creation error:', error);
    res.status(500).json({ error: 'Vendor creation failed' });
  }
});

app.get('/vendors', async (req: Request, res: Response) => {
  try {
    const vendors = await billService.getAllVendors();
    res.status(200).json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

app.post('/bills', async (req: Request, res: Response) => {
  try {
    const { companyId, vendorId, billNumber, billDate, dueDate, reference, notes } = req.body;
    const bill = await billService.createBill(
      companyId,
      vendorId,
      billNumber,
      new Date(billDate),
      new Date(dueDate),
      reference,
      notes
    );
    res.status(201).json(bill);
  } catch (error) {
    console.error('Bill creation error:', error);
    res.status(500).json({ error: 'Bill creation failed' });
  }
});

app.get('/companies/:id/bills', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const bills = await billService.getBillsByCompany(companyId);
    res.status(200).json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

app.post('/bills/:id/items', async (req: Request, res: Response) => {
  try {
    const billId = parseInt(req.params.id);
    const { description, quantity, unitPrice, taxRate, accountId } = req.body;
    const billItem = await billService.addBillItem(
      billId,
      description,
      quantity,
      unitPrice,
      taxRate,
      accountId
    );
    res.status(201).json(billItem);
  } catch (error) {
    console.error('Bill item creation error:', error);
    res.status(500).json({ error: 'Bill item creation failed' });
  }
});

app.post('/bills/:id/status', async (req: Request, res: Response) => {
  try {
    const billId = parseInt(req.params.id);
    const { status } = req.body;
    const bill = await billService.updateBillStatus(billId, status);
    res.status(200).json(bill);
  } catch (error) {
    console.error('Bill status update error:', error);
    res.status(500).json({ error: 'Bill status update failed' });
  }
});

// Simple user registration endpoint (will be expanded with BankID in later phases)
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user already exists
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const user = new User();
    user.email = email;
    user.password = password; // In production, this should be hashed
    user.firstName = firstName;
    user.lastName = lastName;
    
    await userRepository.save(user);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
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
    await AppDataSource.initialize();
    console.log('Database connection established');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};