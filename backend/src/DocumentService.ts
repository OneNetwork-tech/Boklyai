import { AppDataSource } from './database';
import { Document } from './Document';
import { Company } from './Company';
import fs from 'fs/promises';
import path from 'path';

export class DocumentService {
  private documentRepository = AppDataSource.getRepository(Document);
  private companyRepository = AppDataSource.getRepository(Company);

  /**
   * Create a new document record
   * @param companyId Company ID
   * @param filename Generated filename
   * @param originalName Original filename
   * @param mimeType File MIME type
   * @param size File size
   * @param filePath File path on disk
   */
  async createDocument(
    companyId: number,
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    filePath: string
  ): Promise<Document> {
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    const document = new Document();
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
  async getDocumentsByCompany(companyId: number): Promise<Document[]> {
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
  async getDocumentById(id: number): Promise<Document | null> {
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
  async updateDocumentWithOCR(id: number, ocrText: string, documentType: Document['documentType']): Promise<Document> {
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
  async updateDocumentStatus(id: number, status: Document['status']): Promise<Document> {
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
  async deleteDocument(id: number): Promise<void> {
    const document = await this.getDocumentById(id);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file from disk if it exists
    if (document.filePath) {
      try {
        await fs.unlink(document.filePath);
      } catch (error) {
        console.warn('Failed to delete file from disk:', error);
      }
    }

    await this.documentRepository.remove(document);
  }
}