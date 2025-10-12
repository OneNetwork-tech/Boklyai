import { Bill } from './Bill';
import { Vendor } from './Vendor';
export declare class BillService {
    private billRepository;
    private vendorRepository;
    /**
     * Create a new bill
     * @param companyId Company ID
     * @param vendorId Vendor ID
     * @param billNumber Bill number
     * @param billDate Bill date
     * @param dueDate Due date
     * @param amount Amount
     * @param description Description
     * @param reference Reference
     * @param notes Notes
     */
    createBill(companyId: number, vendorId: number, billNumber: string, billDate: Date, dueDate: Date, amount: number, description?: string, reference?: string, notes?: string): Promise<Bill>;
    /**
     * Get bills by company
     * @param companyId Company ID
     */
    getBillsByCompany(companyId: number): Promise<Bill[]>;
    /**
     * Update bill status
     * @param billId Bill ID
     * @param status New status
     */
    updateBillStatus(billId: number, status: string): Promise<Bill>;
    /**
     * Mark bill as paid
     * @param billId Bill ID
     * @param paymentDate Payment date
     * @param paymentMethod Payment method
     */
    markBillAsPaid(billId: number, paymentDate: Date, paymentMethod: string): Promise<Bill>;
    /**
     * Get overdue bills
     * @param companyId Company ID
     */
    getOverdueBills(companyId: number): Promise<Bill[]>;
    /**
     * Get bills by vendor
     * @param vendorId Vendor ID
     */
    getBillsByVendor(vendorId: number): Promise<Bill[]>;
    /**
     * Delete a bill
     * @param billId Bill ID
     */
    deleteBill(billId: number): Promise<boolean>;
    /**
     * Get bill statistics
     * @param companyId Company ID
     */
    getBillStatistics(companyId: number): Promise<{
        total: number;
        paid: number;
        overdue: number;
        draft: number;
        totalAmount: number;
    }>;
    /**
     * Create a new vendor
     * @param companyId Company ID
     * @param name Vendor name
     * @param organizationNumber Organization number
     * @param vatNumber VAT number
     * @param contactPerson Contact person
     * @param email Email
     * @param phone Phone
     * @param address Address
     * @param postalCode Postal code
     * @param city City
     * @param country Country
     * @param notes Notes
     */
    createVendor(companyId: number, name: string, organizationNumber: string, vatNumber: string, contactPerson: string, email: string, phone: string, address: string, postalCode: string, city: string, country: string, notes: string): Promise<Vendor>;
    /**
     * Get all vendors
     */
    getAllVendors(): Promise<Vendor[]>;
    /**
     * Get vendor by ID
     * @param id Vendor ID
     */
    getVendorById(id: number): Promise<Vendor | null>;
}
//# sourceMappingURL=BillService.d.ts.map