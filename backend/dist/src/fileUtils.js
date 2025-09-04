"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueFilename = generateUniqueFilename;
exports.ensureUploadDir = ensureUploadDir;
exports.saveFileBuffer = saveFileBuffer;
exports.getFileBuffer = getFileBuffer;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a unique filename
 * @param originalName Original filename
 * @returns Unique filename with timestamp and random string
 */
function generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const randomString = crypto_1.default.randomBytes(8).toString('hex');
    const extension = path_1.default.extname(originalName);
    const basename = path_1.default.basename(originalName, extension);
    // Truncate basename to 50 characters to avoid filesystem limits
    const truncatedBasename = basename.substring(0, 50);
    return `${truncatedBasename}-${timestamp}-${randomString}${extension}`;
}
/**
 * Ensure upload directory exists
 * @param uploadDir Upload directory path
 */
async function ensureUploadDir(uploadDir) {
    try {
        await promises_1.default.access(uploadDir);
    }
    catch (error) {
        // Directory doesn't exist, create it
        await promises_1.default.mkdir(uploadDir, { recursive: true });
    }
}
/**
 * Save file buffer to disk
 * @param buffer File buffer
 * @param filePath Full file path
 */
async function saveFileBuffer(buffer, filePath) {
    await promises_1.default.writeFile(filePath, buffer);
}
/**
 * Get file buffer from disk
 * @param filePath Full file path
 * @returns File buffer
 */
async function getFileBuffer(filePath) {
    return await promises_1.default.readFile(filePath);
}
//# sourceMappingURL=fileUtils.js.map