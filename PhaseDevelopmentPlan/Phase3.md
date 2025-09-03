Document Management & OCR 

Objectives: Receipt/invoice upload and basic OCR processing

Implement file upload system

Integrate basic OCR for text extraction

Create document storage and management

Develop document categorization

Test Criteria:

Files can be uploaded and stored

OCR extracts text from sample receipts

Documents are categorized correctly

## Implementation Status: COMPLETED

### Entities Created:
1. **Document** - Represents uploaded documents with metadata and OCR results

### Services Implemented:
1. **DocumentService** - Managing document uploads, storage, and retrieval
2. **OcrService** - Processing documents with OCR (placeholder for AI service integration)
3. **File utilities** - Helper functions for file handling

### API Endpoints:
1. **Document Management**
   - POST /documents/upload - Upload a new document
   - GET /companies/:id/documents - List all documents for a company
   - GET /documents/:id - Get a specific document
   - DELETE /documents/:id - Delete a document
   - POST /documents/:id/process-ocr - Process document with OCR

### Features:
- File upload with size limits and unique filename generation
- Document metadata storage (filename, MIME type, size, etc.)
- Document categorization (RECEIPT, INVOICE, BANK_STATEMENT, CONTRACT, OTHER)
- OCR processing with text extraction (placeholder implementation)
- Document status tracking (UPLOADED, PROCESSING, PROCESSED, ERROR)
- File storage on disk with proper cleanup on deletion
- Company-based document organization

### Technology Stack:
- **Multer** for file upload handling
- **Pytesseract** for OCR processing (in AI services)
- **TypeScript/Node.js** for backend services
- **PostgreSQL** for document metadata storage
- **File system** for document storage