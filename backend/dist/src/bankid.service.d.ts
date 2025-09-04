export declare class BankIDService {
    private baseUrl;
    private clientCertificate;
    private clientCertificateKey;
    private caCertificate;
    private axiosInstance;
    constructor();
    /**
     * Initiate an authentication order
     * @param personalNumber The personal number of the user (optional)
     * @param endUserIp The IP address of the user
     */
    authenticate(personalNumber?: string, endUserIp?: string): Promise<any>;
    /**
     * Collect the result of an authentication order
     * @param orderRef The order reference from the authenticate call
     */
    collect(orderRef: string): Promise<any>;
    /**
     * Cancel an authentication order
     * @param orderRef The order reference from the authenticate call
     */
    cancel(orderRef: string): Promise<void>;
}
//# sourceMappingURL=bankid.service.d.ts.map