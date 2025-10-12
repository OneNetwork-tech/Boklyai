import { Request, Response } from 'express';
export declare class BankIDController {
    private bankIDService;
    constructor();
    /**
     * Initiate BankID authentication
     */
    initiateAuth(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Collect authentication status
     */
    collectAuth(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Cancel authentication
     */
    cancelAuth(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get QR code for authentication
     */
    getQRCode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Handle BankID errors
     */
    private handleBankIDError;
    /**
     * Validate IP address
     */
    private isValidIP;
}
//# sourceMappingURL=BankIDController.d.ts.map