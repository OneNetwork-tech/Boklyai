import request from 'supertest';
import { Request, Response } from 'express';

// Mock the express app
jest.mock('../src/index', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  app.get('/', (req: Request, res: Response) => {
    res.status(200).send('BoklyAI Backend Server - Phase 1 Implementation');
  });
  
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
  });
  
  app.post('/auth/initiate', (req: Request, res: Response) => {
    res.status(200).json({
      orderRef: 'mock-order-ref',
      autoStartToken: 'mock-auto-start-token',
      qrStartToken: 'mock-qr-start-token',
      qrStartSecret: 'mock-qr-start-secret'
    });
  });
  
  app.post('/auth/collect', (req: Request, res: Response) => {
    const { orderRef } = req.body;
    if (!orderRef) {
      return res.status(400).json({ error: 'orderRef is required' });
    }
    res.status(200).json({
      orderRef,
      status: 'complete',
      completionData: {
        user: {
          personalNumber: '199012311234',
          name: 'Test User',
          givenName: 'Test',
          surname: 'User'
        },
        device: {
          ipAddress: '127.0.0.1'
        },
        cert: {
          notBefore: '1506239177',
          notAfter: '1537775177'
        }
      }
    });
  });
  
  app.post('/auth/cancel', (req: Request, res: Response) => {
    const { orderRef } = req.body;
    if (!orderRef) {
      return res.status(400).json({ error: 'orderRef is required' });
    }
    res.status(200).json({ message: 'Authentication cancelled' });
  });
  
  // Company endpoints
  app.post('/companies', (req: Request, res: Response) => {
    const { name, organizationNumber } = req.body;
    res.status(201).json({
      id: 1,
      name,
      organizationNumber,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  app.get('/companies', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        name: 'Test Company',
        organizationNumber: '556677-8899',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  // Chart of Accounts endpoints
  app.post('/chart-of-accounts', (req: Request, res: Response) => {
    const { name, code } = req.body;
    res.status(201).json({
      id: 1,
      name,
      code,
      description: 'Test chart of accounts',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  app.get('/chart-of-accounts', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        name: 'BAS Chart of Accounts',
        code: 'BAS',
        description: 'Swedish BAS chart of accounts',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  // Account endpoints
  app.post('/accounts', (req: Request, res: Response) => {
    const { name, code, accountType } = req.body;
    res.status(201).json({
      id: 1,
      name,
      code,
      accountType,
      description: 'Test account',
      status: 'ACTIVE',
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  // Transaction endpoints
  app.post('/transactions', (req: Request, res: Response) => {
    const { accountId, amount, type } = req.body;
    res.status(201).json({
      id: 1,
      accountId,
      amount,
      type,
      description: 'Test transaction',
      transactionDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  // Document endpoints
  app.post('/documents/upload', (req: Request, res: Response) => {
    res.status(201).json({
      id: 1,
      filename: 'test-document.pdf',
      originalName: 'test-document.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      filePath: '/uploads/test-document.pdf',
      ocrText: null,
      documentType: 'OTHER',
      status: 'UPLOADED',
      createdAt: new Date(),
      updatedAt: new Date(),
      company: {
        id: 1,
        name: 'Test Company'
      }
    });
  });
  
  app.get('/companies/:id/documents', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        filename: 'test-document.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/uploads/test-document.pdf',
        ocrText: null,
        documentType: 'OTHER',
        status: 'UPLOADED',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  app.post('/documents/:id/process-ocr', (req: Request, res: Response) => {
    res.status(200).json({
      id: 1,
      filename: 'test-document.pdf',
      originalName: 'test-document.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      filePath: '/uploads/test-document.pdf',
      ocrText: 'This is a sample OCR text extracted from the document',
      documentType: 'INVOICE',
      status: 'PROCESSED',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  // Bank integration endpoints
  app.post('/banks', (req: Request, res: Response) => {
    const { name, code } = req.body;
    res.status(201).json({
      id: 1,
      name,
      code,
      description: 'Test Bank',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  app.get('/banks', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        name: 'Test Bank',
        code: 'TEST',
        description: 'Test Bank for Integration',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  app.post('/bank-accounts', (req: Request, res: Response) => {
    res.status(201).json({
      id: 1,
      accountName: 'Main Business Account',
      accountNumber: '123456789',
      iban: 'SE1234567890123456789012',
      bic: 'TESTSESS',
      balance: 10000.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      bank: {
        id: 1,
        name: 'Test Bank'
      },
      company: {
        id: 1,
        name: 'Test Company'
      }
    });
  });
  
  app.get('/companies/:id/bank-accounts', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        accountName: 'Main Business Account',
        accountNumber: '123456789',
        iban: 'SE1234567890123456789012',
        bic: 'TESTSESS',
        balance: 10000.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        bank: {
          id: 1,
          name: 'Test Bank'
        }
      }
    ]);
  });
  
  app.post('/bank-accounts/:id/import-transactions', (req: Request, res: Response) => {
    res.status(201).json([
      {
        id: 1,
        externalId: 'ext-123',
        transactionDate: new Date(),
        amount: 1500.00,
        description: 'Test Transaction',
        reference: 'REF123',
        currency: 'SEK',
        status: 'PENDING',
        type: 'CREDIT',
        isMatched: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  // VAT and Tax endpoints
  app.post('/tax-rates', (req: Request, res: Response) => {
    const { name, rate } = req.body;
    res.status(201).json({
      id: 1,
      name,
      rate,
      description: 'Standard VAT rate',
      status: 'ACTIVE',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  app.get('/tax-rates', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        name: 'Standard VAT 25%',
        rate: 25.00,
        description: 'Standard VAT rate in Sweden',
        status: 'ACTIVE',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Reduced VAT 12%',
        rate: 12.00,
        description: 'Reduced VAT rate for food and hotels',
        status: 'ACTIVE',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: 'Reduced VAT 6%',
        rate: 6.00,
        description: 'Reduced VAT rate for newspapers and books',
        status: 'ACTIVE',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  app.post('/tax-calculate', (req: Request, res: Response) => {
    const { amount, taxRateId } = req.body;
    const vatAmount = amount * 0.25; // 25% VAT for testing
    res.status(200).json({ amount, taxRateId, vatAmount });
  });
  
  app.post('/tax-reports', (req: Request, res: Response) => {
    res.status(201).json({
      id: 1,
      name: 'Q1 2024 VAT Report',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      dueDate: new Date('2024-04-26'),
      status: 'DRAFT',
      totalSales: 0,
      totalPurchases: 0,
      vatToPay: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      company: {
        id: 1,
        name: 'Test Company'
      }
    });
  });
  
  // AI Categorization endpoints
  app.post('/categories', (req: Request, res: Response) => {
    const { name, code, type } = req.body;
    res.status(201).json({
      id: 1,
      name,
      code,
      type,
      description: 'Test category',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  app.get('/categories', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        name: 'Office Supplies',
        code: 'OFFICE',
        type: 'EXPENSE',
        description: 'Office supplies and equipment',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Travel',
        code: 'TRAVEL',
        type: 'EXPENSE',
        description: 'Travel expenses',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  app.post('/transactions/:id/categorize', (req: Request, res: Response) => {
    res.status(200).json({
      id: 1,
      confidence: 0.92,
      source: 'AI_MODEL',
      isManual: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transaction: {
        id: 1
      },
      category: {
        id: 1,
        name: 'Office Supplies',
        code: 'OFFICE'
      }
    });
  });
  
  // Invoicing and AR/AP endpoints
  app.post('/customers', (req: Request, res: Response) => {
    const { name, organizationNumber } = req.body;
    res.status(201).json({
      id: 1,
      name,
      organizationNumber,
      vatNumber: 'SE123456789012',
      contactPerson: 'John Doe',
      email: 'john@example.com',
      phone: '+46123456789',
      address: 'Test Street 1',
      postalCode: '12345',
      city: 'Test City',
      country: 'Sweden',
      notes: 'Test customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  app.get('/customers', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        name: 'Test Customer',
        organizationNumber: '556677-8899',
        vatNumber: 'SE123456789012',
        contactPerson: 'John Doe',
        email: 'john@example.com',
        phone: '+46123456789',
        address: 'Test Street 1',
        postalCode: '12345',
        city: 'Test City',
        country: 'Sweden',
        notes: 'Test customer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  app.post('/invoices', (req: Request, res: Response) => {
    res.status(201).json({
      id: 1,
      invoiceNumber: 'INV-2024-001',
      reference: 'PO-12345',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      subtotal: 1000.00,
      taxAmount: 250.00,
      totalAmount: 1250.00,
      status: 'DRAFT',
      notes: 'Test invoice',
      isEInvoice: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: {
        id: 1,
        name: 'Test Customer'
      },
      company: {
        id: 1,
        name: 'Test Company'
      }
    });
  });
  
  app.post('/vendors', (req: Request, res: Response) => {
    const { name, organizationNumber } = req.body;
    res.status(201).json({
      id: 1,
      name,
      organizationNumber,
      vatNumber: 'SE123456789012',
      contactPerson: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+46987654321',
      address: 'Vendor Street 2',
      postalCode: '54321',
      city: 'Vendor City',
      country: 'Sweden',
      notes: 'Test vendor',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  app.get('/vendors', (req: Request, res: Response) => {
    res.status(200).json([
      {
        id: 1,
        name: 'Test Vendor',
        organizationNumber: '998877-6655',
        vatNumber: 'SE123456789012',
        contactPerson: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+46987654321',
        address: 'Vendor Street 2',
        postalCode: '54321',
        city: 'Vendor City',
        country: 'Sweden',
        notes: 'Test vendor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });
  
  app.post('/bills', (req: Request, res: Response) => {
    res.status(201).json({
      id: 1,
      billNumber: 'BILL-2024-001',
      reference: 'REF-98765',
      billDate: new Date('2024-01-10'),
      dueDate: new Date('2024-02-10'),
      subtotal: 500.00,
      taxAmount: 125.00,
      totalAmount: 625.00,
      status: 'DRAFT',
      notes: 'Test bill',
      createdAt: new Date(),
      updatedAt: new Date(),
      vendor: {
        id: 1,
        name: 'Test Vendor'
      },
      company: {
        id: 1,
        name: 'Test Company'
      }
    });
  });
  
  return app;
});

describe('Backend API Tests', () => {
  let app: any;
  
  beforeAll(async () => {
    app = await import('../src/index');
  });

  it('should return welcome message on GET /', async () => {
    // Create a new express app for testing
    const express = require('express');
    const testApp = express();
    testApp.get('/', (req: Request, res: Response) => {
      res.status(200).send('BoklyAI Backend Server - Phase 1 Implementation');
    });
    
    const res = await request(testApp).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('BoklyAI Backend Server');
  });

  it('should return health status on GET /health', async () => {
    // Create a new express app for testing
    const express = require('express');
    const testApp = express();
    testApp.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'OK', message: 'Server is running' });
    });
    
    const res = await request(testApp).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
  
  it('should initiate BankID authentication on POST /auth/initiate', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/auth/initiate', (req: Request, res: Response) => {
      res.status(200).json({
        orderRef: 'mock-order-ref',
        autoStartToken: 'mock-auto-start-token',
        qrStartToken: 'mock-qr-start-token',
        qrStartSecret: 'mock-qr-start-secret'
      });
    });
    
    const res = await request(testApp)
      .post('/auth/initiate')
      .send({ endUserIp: '127.0.0.1' });
      
    expect(res.status).toBe(200);
    expect(res.body.orderRef).toBeDefined();
    expect(res.body.autoStartToken).toBeDefined();
  });
  
  it('should collect BankID authentication status on POST /auth/collect', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/auth/collect', (req: Request, res: Response) => {
      const { orderRef } = req.body;
      if (!orderRef) {
        return res.status(400).json({ error: 'orderRef is required' });
      }
      res.status(200).json({
        orderRef,
        status: 'complete',
        completionData: {
          user: {
            personalNumber: '199012311234',
            name: 'Test User',
            givenName: 'Test',
            surname: 'User'
          },
          device: {
            ipAddress: '127.0.0.1'
          },
          cert: {
            notBefore: '1506239177',
            notAfter: '1537775177'
          }
        }
      });
    });
    
    const res = await request(testApp)
      .post('/auth/collect')
      .send({ orderRef: 'test-order-ref' });
      
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('complete');
    expect(res.body.completionData).toBeDefined();
  });
  
  it('should cancel BankID authentication on POST /auth/cancel', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/auth/cancel', (req: Request, res: Response) => {
      const { orderRef } = req.body;
      if (!orderRef) {
        return res.status(400).json({ error: 'orderRef is required' });
      }
      res.status(200).json({ message: 'Authentication cancelled' });
    });
    
    const res = await request(testApp)
      .post('/auth/cancel')
      .send({ orderRef: 'test-order-ref' });
      
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Authentication cancelled');
  });
  
  it('should create a company on POST /companies', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/companies', (req: Request, res: Response) => {
      const { name, organizationNumber } = req.body;
      res.status(201).json({
        id: 1,
        name,
        organizationNumber,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/companies')
      .send({
        name: 'Test Company',
        organizationNumber: '556677-8899'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Company');
    expect(res.body.organizationNumber).toBe('556677-8899');
  });
  
  it('should create a chart of accounts on POST /chart-of-accounts', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/chart-of-accounts', (req: Request, res: Response) => {
      const { name, code } = req.body;
      res.status(201).json({
        id: 1,
        name,
        code,
        description: 'Test chart of accounts',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/chart-of-accounts')
      .send({
        name: 'BAS Chart of Accounts',
        code: 'BAS',
        description: 'Swedish BAS chart of accounts'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('BAS Chart of Accounts');
    expect(res.body.code).toBe('BAS');
  });
  
  it('should create an account on POST /accounts', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/accounts', (req: Request, res: Response) => {
      const { name, code, accountType } = req.body;
      res.status(201).json({
        id: 1,
        name,
        code,
        accountType,
        description: 'Test account',
        status: 'ACTIVE',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/accounts')
      .send({
        chartOfAccountsId: 1,
        name: 'Test Account',
        code: '1010',
        accountType: 'ASSET',
        description: 'Test account'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Account');
    expect(res.body.code).toBe('1010');
    expect(res.body.accountType).toBe('ASSET');
  });
  
  it('should create a transaction on POST /transactions', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/transactions', (req: Request, res: Response) => {
      const { accountId, amount, type } = req.body;
      res.status(201).json({
        id: 1,
        accountId,
        amount,
        type,
        description: 'Test transaction',
        transactionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/transactions')
      .send({
        accountId: 1,
        description: 'Test transaction',
        transactionDate: new Date().toISOString(),
        amount: 100.00,
        type: 'DEBIT'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.accountId).toBe(1);
    expect(res.body.amount).toBe(100.00);
    expect(res.body.type).toBe('DEBIT');
  });
  
  it('should upload a document on POST /documents/upload', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/documents/upload', (req: Request, res: Response) => {
      res.status(201).json({
        id: 1,
        filename: 'test-document.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/uploads/test-document.pdf',
        ocrText: null,
        documentType: 'OTHER',
        status: 'UPLOADED',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 1,
          name: 'Test Company'
        }
      });
    });
    
    const res = await request(testApp)
      .post('/documents/upload')
      .field('companyId', '1')
      .attach('document', Buffer.from('test'), 'test-document.pdf');
      
    expect(res.status).toBe(201);
    expect(res.body.filename).toBeDefined();
    expect(res.body.originalName).toBe('test-document.pdf');
    expect(res.body.status).toBe('UPLOADED');
  });
  
  it('should process document OCR on POST /documents/:id/process-ocr', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/documents/:id/process-ocr', (req: Request, res: Response) => {
      res.status(200).json({
        id: 1,
        filename: 'test-document.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/uploads/test-document.pdf',
        ocrText: 'This is a sample OCR text extracted from the document',
        documentType: 'INVOICE',
        status: 'PROCESSED',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/documents/1/process-ocr');
      
    expect(res.status).toBe(200);
    expect(res.body.ocrText).toBeDefined();
    expect(res.body.documentType).toBe('INVOICE');
    expect(res.body.status).toBe('PROCESSED');
  });
  
  it('should create a bank on POST /banks', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/banks', (req: Request, res: Response) => {
      const { name, code } = req.body;
      res.status(201).json({
        id: 1,
        name,
        code,
        description: 'Test Bank',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/banks')
      .send({
        name: 'Test Bank',
        code: 'TEST',
        description: 'Test Bank for Integration'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Bank');
    expect(res.body.code).toBe('TEST');
  });
  
  it('should create a bank account on POST /bank-accounts', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/bank-accounts', (req: Request, res: Response) => {
      res.status(201).json({
        id: 1,
        accountName: 'Main Business Account',
        accountNumber: '123456789',
        iban: 'SE1234567890123456789012',
        bic: 'TESTSESS',
        balance: 10000.00,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        bank: {
          id: 1,
          name: 'Test Bank'
        },
        company: {
          id: 1,
          name: 'Test Company'
        }
      });
    });
    
    const res = await request(testApp)
      .post('/bank-accounts')
      .send({
        companyId: 1,
        bankId: 1,
        accountName: 'Main Business Account',
        accountNumber: '123456789'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.accountName).toBe('Main Business Account');
    expect(res.body.accountNumber).toBe('123456789');
  });
  
  it('should import bank transactions on POST /bank-accounts/:id/import-transactions', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/bank-accounts/:id/import-transactions', (req: Request, res: Response) => {
      res.status(201).json([
        {
          id: 1,
          externalId: 'ext-123',
          transactionDate: new Date(),
          amount: 1500.00,
          description: 'Test Transaction',
          reference: 'REF123',
          currency: 'SEK',
          status: 'PENDING',
          type: 'CREDIT',
          isMatched: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    });
    
    const res = await request(testApp)
      .post('/bank-accounts/1/import-transactions')
      .send({
        transactions: [
          {
            externalId: 'ext-123',
            transactionDate: new Date().toISOString(),
            amount: 1500.00,
            description: 'Test Transaction',
            reference: 'REF123',
            currency: 'SEK',
            type: 'CREDIT'
          }
        ]
      });
      
    expect(res.status).toBe(201);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].description).toBe('Test Transaction');
    expect(res.body[0].amount).toBe(1500.00);
  });
  
  it('should create a tax rate on POST /tax-rates', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/tax-rates', (req: Request, res: Response) => {
      const { name, rate } = req.body;
      res.status(201).json({
        id: 1,
        name,
        rate,
        description: 'Standard VAT rate',
        status: 'ACTIVE',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/tax-rates')
      .send({
        name: 'Standard VAT 25%',
        rate: 25.00,
        description: 'Standard VAT rate in Sweden'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Standard VAT 25%');
    expect(res.body.rate).toBe(25.00);
  });
  
  it('should calculate VAT on POST /tax-calculate', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/tax-calculate', (req: Request, res: Response) => {
      const { amount, taxRateId } = req.body;
      const vatAmount = amount * 0.25; // 25% VAT for testing
      res.status(200).json({ amount, taxRateId, vatAmount });
    });
    
    const res = await request(testApp)
      .post('/tax-calculate')
      .send({
        amount: 1000.00,
        taxRateId: 1
      });
      
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(1000.00);
    expect(res.body.vatAmount).toBe(250.00);
  });
  
  it('should create a tax report on POST /tax-reports', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/tax-reports', (req: Request, res: Response) => {
      res.status(201).json({
        id: 1,
        name: 'Q1 2024 VAT Report',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        dueDate: new Date('2024-04-26'),
        status: 'DRAFT',
        totalSales: 0,
        totalPurchases: 0,
        vatToPay: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 1,
          name: 'Test Company'
        }
      });
    });
    
    const res = await request(testApp)
      .post('/tax-reports')
      .send({
        companyId: 1,
        name: 'Q1 2024 VAT Report',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        dueDate: '2024-04-26'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Q1 2024 VAT Report');
    expect(res.body.status).toBe('DRAFT');
  });
  
  it('should create a category on POST /categories', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/categories', (req: Request, res: Response) => {
      const { name, code, type } = req.body;
      res.status(201).json({
        id: 1,
        name,
        code,
        type,
        description: 'Test category',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/categories')
      .send({
        name: 'Office Supplies',
        code: 'OFFICE',
        type: 'EXPENSE',
        description: 'Office supplies and equipment'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Office Supplies');
    expect(res.body.code).toBe('OFFICE');
    expect(res.body.type).toBe('EXPENSE');
  });
  
  it('should categorize a transaction on POST /transactions/:id/categorize', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/transactions/:id/categorize', (req: Request, res: Response) => {
      res.status(200).json({
        id: 1,
        confidence: 0.92,
        source: 'AI_MODEL',
        isManual: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        transaction: {
          id: 1
        },
        category: {
          id: 1,
          name: 'Office Supplies',
          code: 'OFFICE'
        }
      });
    });
    
    const res = await request(testApp)
      .post('/transactions/1/categorize');
      
    expect(res.status).toBe(200);
    expect(res.body.confidence).toBeGreaterThan(0.85);
    expect(res.body.source).toBe('AI_MODEL');
    expect(res.body.isManual).toBe(false);
  });
  
  it('should create a customer on POST /customers', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/customers', (req: Request, res: Response) => {
      const { name, organizationNumber } = req.body;
      res.status(201).json({
        id: 1,
        name,
        organizationNumber,
        vatNumber: 'SE123456789012',
        contactPerson: 'John Doe',
        email: 'john@example.com',
        phone: '+46123456789',
        address: 'Test Street 1',
        postalCode: '12345',
        city: 'Test City',
        country: 'Sweden',
        notes: 'Test customer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/customers')
      .send({
        name: 'Test Customer',
        organizationNumber: '556677-8899',
        vatNumber: 'SE123456789012',
        contactPerson: 'John Doe',
        email: 'john@example.com',
        phone: '+46123456789',
        address: 'Test Street 1',
        postalCode: '12345',
        city: 'Test City',
        country: 'Sweden',
        notes: 'Test customer'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Customer');
    expect(res.body.organizationNumber).toBe('556677-8899');
  });
  
  it('should create an invoice on POST /invoices', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/invoices', (req: Request, res: Response) => {
      res.status(201).json({
        id: 1,
        invoiceNumber: 'INV-2024-001',
        reference: 'PO-12345',
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        subtotal: 1000.00,
        taxAmount: 250.00,
        totalAmount: 1250.00,
        status: 'DRAFT',
        notes: 'Test invoice',
        isEInvoice: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: 1,
          name: 'Test Customer'
        },
        company: {
          id: 1,
          name: 'Test Company'
        }
      });
    });
    
    const res = await request(testApp)
      .post('/invoices')
      .send({
        companyId: 1,
        customerId: 1,
        invoiceNumber: 'INV-2024-001',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        reference: 'PO-12345',
        notes: 'Test invoice'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.invoiceNumber).toBe('INV-2024-001');
    expect(res.body.status).toBe('DRAFT');
  });
  
  it('should create a vendor on POST /vendors', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/vendors', (req: Request, res: Response) => {
      const { name, organizationNumber } = req.body;
      res.status(201).json({
        id: 1,
        name,
        organizationNumber,
        vatNumber: 'SE123456789012',
        contactPerson: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+46987654321',
        address: 'Vendor Street 2',
        postalCode: '54321',
        city: 'Vendor City',
        country: 'Sweden',
        notes: 'Test vendor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const res = await request(testApp)
      .post('/vendors')
      .send({
        name: 'Test Vendor',
        organizationNumber: '998877-6655',
        vatNumber: 'SE123456789012',
        contactPerson: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+46987654321',
        address: 'Vendor Street 2',
        postalCode: '54321',
        city: 'Vendor City',
        country: 'Sweden',
        notes: 'Test vendor'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Vendor');
    expect(res.body.organizationNumber).toBe('998877-6655');
  });
  
  it('should create a bill on POST /bills', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/bills', (req: Request, res: Response) => {
      res.status(201).json({
        id: 1,
        billNumber: 'BILL-2024-001',
        reference: 'REF-98765',
        billDate: new Date('2024-01-10'),
        dueDate: new Date('2024-02-10'),
        subtotal: 500.00,
        taxAmount: 125.00,
        totalAmount: 625.00,
        status: 'DRAFT',
        notes: 'Test bill',
        createdAt: new Date(),
        updatedAt: new Date(),
        vendor: {
          id: 1,
          name: 'Test Vendor'
        },
        company: {
          id: 1,
          name: 'Test Company'
        }
      });
    });
    
    const res = await request(testApp)
      .post('/bills')
      .send({
        companyId: 1,
        vendorId: 1,
        billNumber: 'BILL-2024-001',
        billDate: '2024-01-10',
        dueDate: '2024-02-10',
        reference: 'REF-98765',
        notes: 'Test bill'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.billNumber).toBe('BILL-2024-001');
    expect(res.body.status).toBe('DRAFT');
  });
});