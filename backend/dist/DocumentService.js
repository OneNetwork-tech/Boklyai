"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const database_1 = require("./database");
const Document_1 = require("./Document");
const Company_1 = require("./Company");
const promises_1 = __importDefault(require("fs/promises"));
class DocumentService {
    constructor() {
        this.documentRepository = database_1.AppDataSource.getRepository(Document_1.Document);
        this.companyRepository = database_1.AppDataSource.getRepository(Company_1.Company);
    }
    /**
     * Create a new document record
     * @param companyId Company ID
     * @param filename Generated filename
     * @param originalName Original filename
     * @param mimeType File MIME type
     * @param size File size
     * @param filePath File path on disk
     */
    async createDocument(companyId, filename, originalName, mimeType, size, filePath) {
        const company = await this.companyRepository.findOneBy({ id: companyId });
        if (!company) {
            throw new Error('Company not found');
        }
        const document = new Document_1.Document();
        document.company = company;
        document.filename = filename;
        document.originalName = originalName;
        document.mimeType = mimeType;
        document.size = size;
        document.filePath = filePath;
        document.status = 'UPLOADED';
        document.documentType = 'OTHER';
        return await this.documentRepository.save(document);
    }
    /**
     * Get all documents for a company
     * @param companyId Company ID
     */
    async getDocumentsByCompany(companyId) {
        return await this.documentRepository.find({
            where: {
                company: { id: companyId }
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    /**
     * Get document by ID
     * @param id Document ID
     */
    async getDocumentById(id) {
        return await this.documentRepository.findOne({
            where: { id }
        });
    }
    /**
     * Update document with OCR text and type
     * @param id Document ID
     * @param ocrText Extracted OCR text
     * @param documentType Document type
     */
    async updateDocumentWithOCR(id, ocrText, documentType) {
        const document = await this.getDocumentById(id);
        if (!document) {
            throw new Error('Document not found');
        }
        document.ocrText = ocrText;
        document.documentType = documentType;
        document.status = 'PROCESSED';
        return await this.documentRepository.save(document);
    }
    /**
     * Update document status
     * @param id Document ID
     * @param status New status
     */
    async updateDocumentStatus(id, status) {
        const document = await this.getDocumentById(id);
        if (!document) {
            throw new Error('Document not found');
        }
        document.status = status;
        return await this.documentRepository.save(document);
    }
    /**
     * Delete a document
     * @param id Document ID
     */
    async deleteDocument(id) {
        const document = await this.getDocumentById(id);
        if (!document) {
            throw new Error('Document not found');
        }
        // Delete file from disk if it exists
        if (document.filePath) {
            try {
                await promises_1.default.unlink(document.filePath);
            }
            catch (error) {
                console.warn('Failed to delete file from disk:', error);
            }
        }
        await this.documentRepository.remove(document);
    }
}
exports.DocumentService = DocumentService;
//# sourceMappingURL=DocumentService.js.map