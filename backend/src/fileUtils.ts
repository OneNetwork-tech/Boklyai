import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Generate a unique filename
 * @param originalName Original filename
 * @returns Unique filename with timestamp and random string
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName);
  const basename = path.basename(originalName, extension);
  // Truncate basename to 50 characters to avoid filesystem limits
  const truncatedBasename = basename.substring(0, 50);
  return `${truncatedBasename}-${timestamp}-${randomString}${extension}`;
}

/**
 * Ensure upload directory exists
 * @param uploadDir Upload directory path
 */
export async function ensureUploadDir(uploadDir: string): Promise<void> {
  try {
    await fs.access(uploadDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(uploadDir, { recursive: true });
  }
}

/**
 * Save file buffer to disk
 * @param buffer File buffer
 * @param filePath Full file path
 */
export async function saveFileBuffer(buffer: Buffer, filePath: string): Promise<void> {
  await fs.writeFile(filePath, buffer);
}

/**
 * Get file buffer from disk
 * @param filePath Full file path
 * @returns File buffer
 */
export async function getFileBuffer(filePath: string): Promise<Buffer> {
  return await fs.readFile(filePath);
}