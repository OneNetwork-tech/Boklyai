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
export declare class BankIDService {
    private axiosInstance;
    private baseUrl;
    private certPath;
    private keyPath;
    private caPath;
    constructor();
    private readCertificate;
    /**
     * Initiate an authentication order
     */
    authenticate(authRequest: BankIDAuthRequest): Promise<BankIDAuthResponse>;
    /**
     * Collect the result of an authentication order
     */
    collect(orderRef: string): Promise<BankIDCollectResponse>;
    /**
     * Cancel an authentication order
     */
    cancel(orderRef: string): Promise<void>;
    /**
     * Get QR code data for authentication
     */
    getQRCodeData(autoStartToken: string, qrStartToken?: string, qrStartSecret?: string): string;
    private generateQRAuthCode;
    /**
     * Validate personal number format (YYYYMMDDXXXX)
     */
    validatePersonalNumber(personalNumber: string): boolean;
}
export declare class BankIDErrorWrapper extends Error {
    errorCode: string;
    details: string;
    constructor(errorCode: string, details: string);
}
export declare const BankIDErrorCodes: {
    ALREADY_IN_PROGRESS: string;
    INVALID_PARAMETERS: string;
    UNAUTHORIZED: string;
    NOT_FOUND: string;
    REQUEST_TIMEOUT: string;
    UNSUPPORTED_MEDIA_TYPE: string;
    INTERNAL_ERROR: string;
    MAINTENANCE: string;
};
//# sourceMappingURL=bankid.service.d.ts.map