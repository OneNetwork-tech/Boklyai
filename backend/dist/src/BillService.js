"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillService = void 0;
const database_1 = require("./database");
const Bill_1 = require("./Bill");
const Vendor_1 = require("./Vendor");
class BillService {
    constructor() {
        this.billRepository = database_1.AppDataSource.getRepository(Bill_1.Bill);
        this.vendorRepository = database_1.AppDataSource.getRepository(Vendor_1.Vendor);
    }
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
    async createBill(companyId, vendorId, billNumber, billDate, dueDate, amount, description, reference, notes) {
        const bill = new Bill_1.Bill();
        // Use relation objects instead of direct IDs
        bill.company = { id: companyId };
        bill.vendor = { id: vendorId };
        bill.billNumber = billNumber;
        bill.billDate = billDate;
        bill.dueDate = dueDate;
        bill.amount = amount;
        bill.description = description || '';
        bill.reference = reference || '';
        bill.notes = notes || '';
        bill.status = 'DRAFT';
        return await this.billRepository.save(bill);
    }
    /**
     * Get bills by company
     * @param companyId Company ID
     */
    async getBillsByCompany(companyId) {
        return await this.billRepository.find({
            where: { company: { id: companyId } },
            relations: ['vendor'],
            order: { billDate: 'DESC' }
        });
    }
    /**
     * Update bill status
     * @param billId Bill ID
     * @param status New status
     */
    async updateBillStatus(billId, status) {
        const bill = await this.billRepository.findOneBy({ id: billId });
        if (!bill) {
            throw new Error('Bill not found');
        }
        bill.status = status;
        return await this.billRepository.save(bill);
    }
    /**
     * Mark bill as paid
     * @param billId Bill ID
     * @param paymentDate Payment date
     * @param paymentMethod Payment method
     */
    async markBillAsPaid(billId, paymentDate, paymentMethod) {
        const bill = await this.billRepository.findOneBy({ id: billId });
        if (!bill) {
            throw new Error('Bill not found');
        }
        bill.status = 'PAID';
        bill.paymentDate = paymentDate;
        bill.paymentMethod = paymentMethod;
        return await this.billRepository.save(bill);
    }
    /**
     * Get overdue bills
     * @param companyId Company ID
     */
    async getOverdueBills(companyId) {
        const today = new Date();
        return await this.billRepository.find({
            where: {
                company: { id: companyId },
                status: 'SENT',
                dueDate: { $lt: today }
            },
            relations: ['vendor']
        });
    }
    /**
     * Get bills by vendor
     * @param vendorId Vendor ID
     */
    async getBillsByVendor(vendorId) {
        return await this.billRepository.find({
            where: { vendor: { id: vendorId } },
            relations: ['company'],
            order: { billDate: 'DESC' }
        });
    }
    /**
     * Delete a bill
     * @param billId Bill ID
     */
    async deleteBill(billId) {
        const result = await this.billRepository.delete(billId);
        return result.affected !== null && result.affected > 0;
    }
    /**
     * Get bill statistics
     * @param companyId Company ID
     */
    async getBillStatistics(companyId) {
        const bills = await this.getBillsByCompany(companyId);
        const total = bills.length;
        const paid = bills.filter(b => b.status === 'PAID').length;
        const overdue = bills.filter(b => b.status === 'OVERDUE').length;
        const draft = bills.filter(b => b.status === 'DRAFT').length;
        const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
        return { total, paid, overdue, draft, totalAmount };
    }
}
exports.BillService = BillService;
//# sourceMappingURL=BillService.js.map