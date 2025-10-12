import { Request, Response } from 'express';
import { BankIDService, BankIDErrorWrapper, BankIDErrorCodes } from '../bankid.service';

export class BankIDController {
  private bankIDService: BankIDService;

  constructor() {
    this.bankIDService = new BankIDService();
  }

  /**
   * Initiate BankID authentication
   */
  async initiateAuth(req: Request, res: Response) {
    try {
      const { personalNumber, endUserIp } = req.body;

      // Validate IP address
      if (!endUserIp || !this.isValidIP(endUserIp)) {
        return res.status(400).json({
          error: 'Invalid endUserIp',
          details: 'A valid IP address is required'
        });
      }

      // Validate personal number if provided
      if (personalNumber && !this.bankIDService.validatePersonalNumber(personalNumber)) {
        return res.status(400).json({
          error: 'Invalid personalNumber',
          details: 'Personal number must be in format YYYYMMDDXXXX'
        });
      }

      const authResponse = await this.bankIDService.authenticate({
        personalNumber,
        endUserIp
      });

      res.status(200).json(authResponse);
    } catch (error) {
      this.handleBankIDError(error, res);
    }
  }

  /**
   * Collect authentication status
   */
  async collectAuth(req: Request, res: Response) {
    try {
      const { orderRef } = req.body;

      if (!orderRef) {
        return res.status(400).json({
          error: 'orderRef is required'
        });
      }

      const collectResponse = await this.bankIDService.collect(orderRef);
      res.status(200).json(collectResponse);
    } catch (error) {
      this.handleBankIDError(error, res);
    }
  }

  /**
   * Cancel authentication
   */
  async cancelAuth(req: Request, res: Response) {
    try {
      const { orderRef } = req.body;

      if (!orderRef) {
        return res.status(400).json({
          error: 'orderRef is required'
        });
      }

      await this.bankIDService.cancel(orderRef);
      res.status(200).json({ message: 'Authentication cancelled successfully' });
    } catch (error) {
      this.handleBankIDError(error, res);
    }
  }

  /**
   * Get QR code for authentication
   */
  async getQRCode(req: Request, res: Response) {
    try {
      const { autoStartToken, qrStartToken, qrStartSecret } = req.body;

      if (!autoStartToken) {
        return res.status(400).json({
          error: 'autoStartToken is required'
        });
      }

      const qrCode = this.bankIDService.getQRCodeData(autoStartToken, qrStartToken, qrStartSecret);
      res.status(200).json({ qrCode });
    } catch (error) {
      this.handleBankIDError(error, res);
    }
  }

  /**
   * Handle BankID errors
   */
  private handleBankIDError(error: any, res: Response) {
    console.error('BankID controller error:', error);

    if (error instanceof BankIDErrorWrapper) {
      switch (error.errorCode) {
        case BankIDErrorCodes.INVALID_PARAMETERS:
          return res.status(400).json({
            error: error.errorCode,
            details: error.details
          });
        case BankIDErrorCodes.UNAUTHORIZED:
          return res.status(401).json({
            error: error.errorCode,
            details: 'Invalid certificates or configuration'
          });
        case BankIDErrorCodes.NOT_FOUND:
          return res.status(404).json({
            error: error.errorCode,
            details: error.details
          });
        default:
          return res.status(500).json({
            error: error.errorCode,
            details: error.details
          });
      }
    }

    // Generic error
    res.status(500).json({
      error: 'internal_error',
      details: 'An internal server error occurred'
    });
  }

  /**
   * Validate IP address
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}