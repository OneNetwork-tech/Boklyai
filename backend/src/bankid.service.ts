import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import https from 'https';
import path from 'path';

export interface BankIDAuthRequest {
  personalNumber?: string;
  endUserIp: string;
}

export interface BankIDAuthResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken?: string;
  qrStartSecret?: string;
}

export interface BankIDCollectResponse {
  orderRef: string;
  status: 'pending' | 'complete' | 'failed';
  hintCode?: string;
  completionData?: {
    user: {
      personalNumber: string;
      name: string;
      givenName: string;
      surname: string;
    };
    device: {
      ipAddress: string;
    };
    cert: {
      notBefore: string;
      notAfter: string;
    };
    signature: string;
    ocspResponse: string;
  };
}

export interface BankIDError {
  errorCode: string;
  details: string;
}

export class BankIDService {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private certPath: string;
  private keyPath: string;
  private caPath: string;

  constructor() {
    // Determine environment
    const isProduction = process.env.NODE_ENV === 'production';
    this.baseUrl = isProduction 
      ? 'https://appapi2.bankid.com/rp/v5.1' 
      : 'https://appapi2.test.bankid.com/rp/v5.1';

    // Set certificate paths based on environment
    this.certPath = process.env.BANKID_CERT_PATH || 
      path.join(__dirname, '..', 'certs', 'bankid', isProduction ? 'production' : 'test', 'cert.pem');
    this.keyPath = process.env.BANKID_KEY_PATH || 
      path.join(__dirname, '..', 'certs', 'bankid', isProduction ? 'production' : 'test', 'key.pem');
    this.caPath = process.env.BANKID_CA_PATH || 
      path.join(__dirname, '..', 'certs', 'bankid', isProduction ? 'production' : 'test', 'ca.pem');

    // Create HTTPS agent with certificates
    const httpsAgent = new https.Agent({
      cert: this.readCertificate(this.certPath),
      key: this.readCertificate(this.keyPath),
      ca: this.readCertificate(this.caPath),
      rejectUnauthorized: true
    });

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.data) {
          throw new BankIDErrorWrapper(error.response.data.errorCode, error.response.data.details);
        }
        throw error;
      }
    );
  }

  private readCertificate(filePath: string): Buffer {
    try {
      return fs.readFileSync(filePath);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to read certificate file: ${filePath}. Error: ${error.message}`);
      }
      throw new Error(`Failed to read certificate file: ${filePath}. Unknown error occurred.`);
    }
  }

  /**
   * Initiate an authentication order
   */
  async authenticate(authRequest: BankIDAuthRequest): Promise<BankIDAuthResponse> {
    try {
      const response = await this.axiosInstance.post('/auth', authRequest);
      return response.data;
    } catch (error) {
      console.error('BankID authentication error:', error);
      throw error;
    }
  }

  /**
   * Collect the result of an authentication order
   */
  async collect(orderRef: string): Promise<BankIDCollectResponse> {
    try {
      const response = await this.axiosInstance.post('/collect', { orderRef });
      return response.data;
    } catch (error) {
      console.error('BankID collect error:', error);
      throw error;
    }
  }

  /**
   * Cancel an authentication order
   */
  async cancel(orderRef: string): Promise<void> {
    try {
      await this.axiosInstance.post('/cancel', { orderRef });
    } catch (error) {
      console.error('BankID cancel error:', error);
      throw error;
    }
  }

  /**
   * Get QR code data for authentication
   */
  getQRCodeData(autoStartToken: string, qrStartToken?: string, qrStartSecret?: string): string {
    if (!qrStartToken || !qrStartSecret) {
      return `bankid.${autoStartToken}.${Date.now()}`;
    }

    const time = Math.floor(Date.now() / 1000);
    const qrAuthCode = this.generateQRAuthCode(qrStartSecret, time);
    return `bankid.${qrStartToken}.${time}.${qrAuthCode}`;
  }

  private generateQRAuthCode(qrStartSecret: string, time: number): string {
    // This is a simplified version - in a real implementation, you'd use proper crypto
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', qrStartSecret);
    hmac.update(time.toString());
    return hmac.digest('hex').substring(0, 16);
  }

  /**
   * Validate personal number format (YYYYMMDDXXXX)
   */
  validatePersonalNumber(personalNumber: string): boolean {
    const regex = /^\d{12}$/;
    if (!regex.test(personalNumber)) {
      return false;
    }

    // Basic validation of birth date
    const year = parseInt(personalNumber.substring(0, 4));
    const month = parseInt(personalNumber.substring(4, 6));
    const day = parseInt(personalNumber.substring(6, 8));

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) {
      return false;
    }

    return true;
  }
}

export class BankIDErrorWrapper extends Error {
  public errorCode: string;
  public details: string;

  constructor(errorCode: string, details: string) {
    super(`BankID Error: ${errorCode} - ${details}`);
    this.name = 'BankIDError';
    this.errorCode = errorCode;
    this.details = details;
  }
}

// Common BankID error codes
export const BankIDErrorCodes = {
  ALREADY_IN_PROGRESS: 'alreadyInProgress',
  INVALID_PARAMETERS: 'invalidParameters',
  UNAUTHORIZED: 'unauthorized',
  NOT_FOUND: 'notFound',
  REQUEST_TIMEOUT: 'requestTimeout',
  UNSUPPORTED_MEDIA_TYPE: 'unsupportedMediaType',
  INTERNAL_ERROR: 'internalError',
  MAINTENANCE: 'maintenance'
};