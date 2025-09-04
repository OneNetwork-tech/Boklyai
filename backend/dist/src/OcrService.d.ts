import { Document } from './Document';
export declare class OcrService {
    private aiServiceUrl;
    constructor(aiServiceUrl?: string);
    /**
     * Process document with OCR
     * @param document Document to process
     * @param fileBuffer File buffer
     */
    processDocument(document: Document, fileBuffer: Buffer): Promise<{
        text: string;
        documentType: Document['documentType'];
    }>;
}
//# sourceMappingURL=OcrService.d.ts.map