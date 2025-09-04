"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const database_1 = require("./database");
const Invoice_1 = require("./Invoice");
const InvoiceItem_1 = require("./InvoiceItem");
const Customer_1 = require("./Customer");
const Account_1 = require("./Account");
class InvoiceService {
    constructor() {
        this.invoiceRepository = database_1.AppDataSource.getRepository(Invoice_1.Invoice);
        this.invoiceItemRepository = database_1.AppDataSource.getRepository(InvoiceItem_1.InvoiceItem);
        this.customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
    }
    /**
     * Create a new invoice
     * @param companyId Company ID
     * @param customerId Customer ID
     * @param invoiceNumber Invoice number
     * @param invoiceDate Invoice date
     * @param dueDate Due date
     * @param reference Reference
     * @param notes Notes
     */
    async createInvoice(companyId, customerId, invoiceNumber, invoiceDate, dueDate, reference = '', notes = '') {
        const invoice = new Invoice_1.Invoice();
        // Use relation objects instead of direct IDs
        invoice.company = { id: companyId };
        invoice.customer = { id: customerId };
        invoice.invoiceNumber = invoiceNumber;
        invoice.invoiceDate = invoiceDate;
        invoice.dueDate = dueDate;
        invoice.reference = reference;
        invoice.notes = notes;
        invoice.status = 'DRAFT';
        invoice.subtotal = 0;
        invoice.taxAmount = 0;
        invoice.totalAmount = 0;
        return await this.invoiceRepository.save(invoice);
    }
    /**
     * Get invoices by company
     * @param companyId Company ID
     */
    async getInvoicesByCompany(companyId) {
        return await this.invoiceRepository.find({
            where: { company: { id: companyId } },
            relations: ['customer', 'items'],
            order: { invoiceDate: 'DESC' }
        });
    }
    /**
     * Add item to invoice
     * @param invoiceId Invoice ID
     * @param accountId Account ID
     * @param description Description
     * @param quantity Quantity
     * @param unitPrice Unit price
     * @param taxRate Tax rate
     */
    async addInvoiceItem(invoiceId, accountId, description, quantity, unitPrice, taxRate = 0) {
        const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        const account = await this.accountRepository.findOneBy({ id: accountId });
        if (!account) {
            throw new Error('Account not found');
        }
        const invoiceItem = new InvoiceItem_1.InvoiceItem();
        invoiceItem.invoice = invoice;
        invoiceItem.account = account;
        invoiceItem.description = description;
        invoiceItem.quantity = quantity;
        invoiceItem.unitPrice = unitPrice;
        invoiceItem.taxRate = taxRate;
        // Calculate amounts
        const subtotal = quantity * unitPrice;
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;
        invoiceItem.subtotal = subtotal;
        invoiceItem.taxAmount = taxAmount;
        invoiceItem.totalAmount = totalAmount;
        // Update invoice totals
        invoice.subtotal += subtotal;
        invoice.taxAmount += taxAmount;
        invoice.totalAmount += totalAmount;
        await this.invoiceRepository.save(invoice);
        return await this.invoiceItemRepository.save(invoiceItem);
    }
    /**
     * Update invoice status
     * @param invoiceId Invoice ID
     * @param status New status
     */
    async updateInvoiceStatus(invoiceId, status) {
        const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        invoice.status = status;
        return await this.invoiceRepository.save(invoice);
    }
    /**
     * Mark invoice as paid
     * @param invoiceId Invoice ID
     * @param paymentDate Payment date
     * @param paymentMethod Payment method
     */
    async markInvoiceAsPaid(invoiceId, paymentDate, paymentMethod) {
        const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        invoice.status = 'PAID';
        invoice.paymentDate = paymentDate;
        invoice.paymentMethod = paymentMethod;
        return await this.invoiceRepository.save(invoice);
    }
    /**
     * Get overdue invoices
     * @param companyId Company ID
     */
    async getOverdueInvoices(companyId) {
        const today = new Date();
        return await this.invoiceRepository.find({
            where: {
                company: { id: companyId },
                status: 'SENT',
                dueDate: { $lt: today }
            },
            relations: ['customer']
        });
    }
    /**
     * Get invoices by customer
     * @param customerId Customer ID
     */
    async getInvoicesByCustomer(customerId) {
        return await this.invoiceRepository.find({
            where: { customer: { id: customerId } },
            relations: ['company'],
            order: { invoiceDate: 'DESC' }
        });
    }
    /**
     * Delete an invoice
     * @param invoiceId Invoice ID
     */
    async deleteInvoice(invoiceId) {
        const result = await this.invoiceRepository.delete(invoiceId);
        return result.affected !== null && result.affected > 0;
    }
    /**
     * Get invoice statistics
     * @param companyId Company ID
     */
    async getInvoiceStatistics(companyId) {
        const invoices = await this.getInvoicesByCompany(companyId);
        const total = invoices.length;
        const paid = invoices.filter(i => i.status === 'PAID').length;
        const overdue = invoices.filter(i => i.status === 'OVERDUE').length;
        const draft = invoices.filter(i => i.status === 'DRAFT').length;
        const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        return { total, paid, overdue, draft, totalAmount };
    }
}
exports.InvoiceService = InvoiceService;
//# sourceMappingURL=InvoiceService.js.map