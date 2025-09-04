import { Bill } from './Bill';
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
}
//# sourceMappingURL=BillService.d.ts.map