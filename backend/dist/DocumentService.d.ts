import { Document } from './Document';
export declare class DocumentService {
    private documentRepository;
    private companyRepository;
    /**
     * Create a new document record
     * @param companyId Company ID
     * @param filename Generated filename
     * @param originalName Original filename
     * @param mimeType File MIME type
     * @param size File size
     * @param filePath File path on disk
     */
    createDocument(companyId: number, filename: string, originalName: string, mimeType: string, size: number, filePath: string): Promise<Document>;
    /**
     * Get all documents for a company
     * @param companyId Company ID
     */
    getDocumentsByCompany(companyId: number): Promise<Document[]>;
    /**
     * Get document by ID
     * @param id Document ID
     */
    getDocumentById(id: number): Promise<Document | null>;
    /**
     * Update document with OCR text and type
     * @param id Document ID
     * @param ocrText Extracted OCR text
     * @param documentType Document type
     */
    updateDocumentWithOCR(id: number, ocrText: string, documentType: Document['documentType']): Promise<Document>;
    /**
     * Update document status
     * @param id Document ID
     * @param status New status
     */
    updateDocumentStatus(id: number, status: Document['status']): Promise<Document>;
    /**
     * Delete a document
     * @param id Document ID
     */
    deleteDocument(id: number): Promise<void>;
}
//# sourceMappingURL=DocumentService.d.ts.map