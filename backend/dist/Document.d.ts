import { Company } from './Company';
export declare class Document {
    id: number;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    filePath: string;
    ocrText: string;
    documentType: 'RECEIPT' | 'INVOICE' | 'BANK_STATEMENT' | 'CONTRACT' | 'OTHER';
    status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
    createdAt: Date;
    updatedAt: Date;
    company: Company;
}
//# sourceMappingURL=Document.d.ts.map