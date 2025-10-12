import { Invoice } from './Invoice';
import { InvoiceItem } from './InvoiceItem';
import { Customer } from './Customer';
export declare class InvoiceService {
    private invoiceRepository;
    private invoiceItemRepository;
    private customerRepository;
    private accountRepository;
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
    createInvoice(companyId: number, customerId: number, invoiceNumber: string, invoiceDate: Date, dueDate: Date, reference?: string, notes?: string): Promise<Invoice>;
    /**
     * Get invoices by company
     * @param companyId Company ID
     */
    getInvoicesByCompany(companyId: number): Promise<Invoice[]>;
    /**
     * Add item to invoice
     * @param invoiceId Invoice ID
     * @param accountId Account ID
     * @param description Description
     * @param quantity Quantity
     * @param unitPrice Unit price
     * @param taxRate Tax rate
     */
    addInvoiceItem(invoiceId: number, accountId: number, description: string, quantity: number, unitPrice: number, taxRate?: number): Promise<InvoiceItem>;
    /**
     * Update invoice status
     * @param invoiceId Invoice ID
     * @param status New status
     */
    updateInvoiceStatus(invoiceId: number, status: string): Promise<Invoice>;
    /**
     * Mark invoice as paid
     * @param invoiceId Invoice ID
     * @param paymentDate Payment date
     * @param paymentMethod Payment method
     */
    markInvoiceAsPaid(invoiceId: number): Promise<Invoice>;
    /**
     * Get overdue invoices
     * @param companyId Company ID
     */
    getOverdueInvoices(companyId: number): Promise<Invoice[]>;
    /**
     * Get invoices by customer
     * @param customerId Customer ID
     */
    getInvoicesByCustomer(customerId: number): Promise<Invoice[]>;
    /**
     * Create a new customer
     * @param name Customer name
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
    createCustomer(name: string, organizationNumber: string, vatNumber: string, contactPerson: string, email: string, phone: string, address: string, postalCode: string, city: string, country: string, notes: string): Promise<Customer>;
    /**
     * Get all customers
     */
    getAllCustomers(): Promise<Customer[]>;
    /**
     * Get customer by ID
     * @param id Customer ID
     */
    getCustomerById(id: number): Promise<Customer | null>;
    /**
     * Delete an invoice
     * @param invoiceId Invoice ID
     */
    deleteInvoice(invoiceId: number): Promise<boolean>;
    /**
     * Get invoice statistics
     * @param companyId Company ID
     */
    getInvoiceStatistics(companyId: number): Promise<{
        total: number;
        paid: number;
        overdue: number;
        draft: number;
        totalAmount: number;
    }>;
}
//# sourceMappingURL=InvoiceService.d.ts.map