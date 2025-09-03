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