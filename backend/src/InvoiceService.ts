import { AppDataSource } from './database';
import { Invoice } from './Invoice';
import { InvoiceItem } from './InvoiceItem';
import { Customer } from './Customer';
import { Company } from './Company';
import { Account } from './Account';

export class InvoiceService {
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private invoiceItemRepository = AppDataSource.getRepository(InvoiceItem);
  private customerRepository = AppDataSource.getRepository(Customer);
  private accountRepository = AppDataSource.getRepository(Account);

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
  async createInvoice(
    companyId: number,
    customerId: number,
    invoiceNumber: string,
    invoiceDate: Date,
    dueDate: Date,
    reference: string = '',
    notes: string = ''
  ): Promise<Invoice> {
    const invoice = new Invoice();
    
    // Use relation objects instead of direct IDs
    invoice.company = { id: companyId } as Company;
    invoice.customer = { id: customerId } as Customer;
    
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
  async getInvoicesByCompany(companyId: number): Promise<Invoice[]> {
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
  async addInvoiceItem(
    invoiceId: number,
    accountId: number,
    description: string,
    quantity: number,
    unitPrice: number,
    taxRate: number = 0
  ): Promise<InvoiceItem> {
    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const account = await this.accountRepository.findOneBy({ id: accountId });
    if (!account) {
      throw new Error('Account not found');
    }

    const invoiceItem = new InvoiceItem();
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

    invoiceItem.totalAmount = totalAmount;
    invoiceItem.taxAmount = taxAmount;

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
  async updateInvoiceStatus(invoiceId: number, status: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Mark invoice as paid
   * @param invoiceId Invoice ID
   * @param paymentDate Payment date
   * @param paymentMethod Payment method
   */
  async markInvoiceAsPaid(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = 'PAID';

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Get overdue invoices
   * @param companyId Company ID
   */
  async getOverdueInvoices(companyId: number): Promise<Invoice[]> {
    const today = new Date();
    return await this.invoiceRepository.find({
      where: {
        company: { id: companyId },
        status: 'SENT',
        dueDate: { $lt: today } as any
      },
      relations: ['customer']
    });
  }

  /**
   * Get invoices by customer
   * @param customerId Customer ID
   */
  async getInvoicesByCustomer(customerId: number): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: { customer: { id: customerId } },
      relations: ['company'],
      order: { invoiceDate: 'DESC' }
    });
  }

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
  async createCustomer(
    name: string,
    organizationNumber: string,
    vatNumber: string,
    contactPerson: string,
    email: string,
    phone: string,
    address: string,
    postalCode: string,
    city: string,
    country: string,
    notes: string
  ): Promise<Customer> {
    const customer = new Customer();
    customer.name = name;
    customer.organizationNumber = organizationNumber;
    customer.vatNumber = vatNumber;
    customer.contactPerson = contactPerson;
    customer.email = email;
    customer.phone = phone;
    customer.address = address;
    customer.postalCode = postalCode;
    customer.city = city;
    customer.country = country;
    customer.notes = notes;
    customer.isActive = true;

    return await this.customerRepository.save(customer);
  }

  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<Customer[]> {
    return await this.customerRepository.find({ where: { isActive: true } });
  }

  /**
   * Get customer by ID
   * @param id Customer ID
   */
  async getCustomerById(id: number): Promise<Customer | null> {
    return await this.customerRepository.findOneBy({ id, isActive: true });
  }

  /**
   * Delete an invoice
   * @param invoiceId Invoice ID
   */
  async deleteInvoice(invoiceId: number): Promise<boolean> {
    const result = await this.invoiceRepository.delete(invoiceId);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get invoice statistics
   * @param companyId Company ID
   */
  async getInvoiceStatistics(companyId: number): Promise<{
    total: number;
    paid: number;
    overdue: number;
    draft: number;
    totalAmount: number;
  }> {
    const invoices = await this.getInvoicesByCompany(companyId);
    
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'PAID').length;
    const overdue = invoices.filter(i => i.status === 'OVERDUE').length;
    const draft = invoices.filter(i => i.status === 'DRAFT').length;
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    return { total, paid, overdue, draft, totalAmount };
  }
}