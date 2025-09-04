/**
 * Generate a unique filename
 * @param originalName Original filename
 * @returns Unique filename with timestamp and random string
 */
export declare function generateUniqueFilename(originalName: string): string;
/**
 * Ensure upload directory exists
 * @param uploadDir Upload directory path
 */
export declare function ensureUploadDir(uploadDir: string): Promise<void>;
/**
 * Save file buffer to disk
 * @param buffer File buffer
 * @param filePath Full file path
 */
export declare function saveFileBuffer(buffer: Buffer, filePath: string): Promise<void>;
/**
 * Get file buffer from disk
 * @param filePath Full file path
 * @returns File buffer
 */
export declare function getFileBuffer(filePath: string): Promise<Buffer>;
//# sourceMappingURL=fileUtils.d.ts.map