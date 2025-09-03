import axios from 'axios';
import { Document } from './Document';

export class OcrService {
  private aiServiceUrl: string;

  constructor(aiServiceUrl?: string) {
    // Default to localhost:5000 for development
    this.aiServiceUrl = aiServiceUrl || process.env.AI_SERVICE_URL || 'http://localhost:5000';
  }

  /**
   * Process document with OCR
   * @param document Document to process
   * @param fileBuffer File buffer
   */
  async processDocument(document: Document, fileBuffer: Buffer): Promise<{ text: string; documentType: Document['documentType'] }> {
    try {
      // In a real implementation, this would call the AI service
      // For now, we'll return mock data
      console.log(`Processing document ${document.id} with OCR service at ${this.aiServiceUrl}`);
      
      // This is a placeholder implementation
      // In a real implementation, you would send the file to the AI service
      // and receive the OCR results back
      
      // Mock OCR result
      const mockOcrText = `This is a mock OCR result for document: ${document.originalName}
      
Document Type: INVOICE
Total Amount: 1,250.00 SEK
Date: 2023-10-15
Supplier: ACME Corporation
VAT: 250.00 SEK`;

      // Simple document type detection based on filename
      let documentType: Document['documentType'] = 'OTHER';
      const lowerName = document.originalName.toLowerCase();
      
      if (lowerName.includes('receipt') || lowerName.includes('kvitto')) {
        documentType = 'RECEIPT';
      } else if (lowerName.includes('invoice') || lowerName.includes('faktura')) {
        documentType = 'INVOICE';
      } else if (lowerName.includes('statement') || lowerName.includes('kontoutdrag')) {
        documentType = 'BANK_STATEMENT';
      } else if (lowerName.includes('contract') || lowerName.includes('avtal')) {
        documentType = 'CONTRACT';
      }

      return {
        text: mockOcrText,
        documentType
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('OCR processing failed');
    }
  }
}