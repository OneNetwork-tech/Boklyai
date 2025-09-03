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
  private companyRepository = AppDataSource.getRepository(Company);
  private accountRepository = AppDataSource.getRepository(Account);

  /**
   * Create a new customer
   * @param name Customer name
   * @param organizationNumber Organization number
   * @param vatNumber VAT number
   * @param contactPerson Contact person
   * @param email Email
   * @param phone Phone number
   * @param address Address
   * @param postalCode Postal code
   * @param city City
   * @param country Country
   * @param notes Notes
   */
  async createCustomer(
    name: string,
    organizationNumber: string,
    vatNumber?: string,
    contactPerson?: string,
    email?: string,
    phone?: string,
    address?: string,
    postalCode?: string,
    city?: string,
    country?: string,
    notes?: string
  ): Promise<Customer> {
    // Check if customer with this organization number already exists
    const existingCustomer = await this.customerRepository.findOneBy({ organizationNumber });
    if (existingCustomer) {
      throw new Error('Customer with this organization number already exists');
    }

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
    return await this.customerRepository.find({
      where: { isActive: true }
    });
  }

  /**
   * Get customer by ID
   * @param id Customer ID
   */
  async getCustomerById(id: number): Promise<Customer | null> {
    return await this.customerRepository.findOne({
      where: { id, isActive: true }
    });
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
   * @param isEInvoice Is e-invoice
   */
  async createInvoice(
    companyId: number,
    customerId: number,
    invoiceNumber: string,
    invoiceDate: Date,
    dueDate: Date,
    reference?: string,
    notes?: string,
    isEInvoice: boolean = false
  ): Promise<Invoice> {
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    const customer = await this.customerRepository.findOneBy({ id: customerId });
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Check if invoice with this number already exists
    const existingInvoice = await this.invoiceRepository.findOneBy({ invoiceNumber });
    if (existingInvoice) {
      throw new Error('Invoice with this number already exists');
    }

    const invoice = new Invoice();
    invoice.company = company;
    invoice.customer = customer;
    invoice.invoiceNumber = invoiceNumber;
    invoice.invoiceDate = invoiceDate;
    invoice.dueDate = dueDate;
    invoice.reference = reference;
    invoice.notes = notes;
    invoice.isEInvoice = isEInvoice;
    invoice.status = 'DRAFT';
    invoice.subtotal = 0;
    invoice.taxAmount = 0;
    invoice.totalAmount = 0;

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Get all invoices for a company
   * @param companyId Company ID
   */
  async getInvoicesByCompany(companyId: number): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: {
        company: { id: companyId }
      },
      relations: ['customer'],
      order: {
        createdAt: 'DESC'
      }
    });
  }

  /**
   * Get invoice by ID
   * @param id Invoice ID
   */
  async getInvoiceById(id: number): Promise<Invoice | null> {
    return await this.invoiceRepository.findOne({
      where: { id },
      relations: ['customer', 'company', 'items', 'items.account']
    });
  }

  /**
   * Add item to invoice
   * @param invoiceId Invoice ID
   * @param description Item description
   * @param quantity Quantity
   * @param unitPrice Unit price
   * @param taxRate Tax rate
   * @param accountId Account ID
   */
  async addInvoiceItem(
    invoiceId: number,
    description: string,
    quantity: number,
    unitPrice: number,
    taxRate: number,
    accountId: number
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
    invoiceItem.description = description;
    invoiceItem.quantity = quantity;
    invoiceItem.unitPrice = unitPrice;
    invoiceItem.taxRate = taxRate;
    invoiceItem.taxAmount = Number((quantity * unitPrice * taxRate / 100).toFixed(2));
    invoiceItem.totalAmount = Number((quantity * unitPrice + invoiceItem.taxAmount).toFixed(2));

    const savedItem = await this.invoiceItemRepository.save(invoiceItem);

    // Update invoice totals
    await this.updateInvoiceTotals(invoiceId);

    return savedItem;
  }

  /**
   * Update invoice totals
   * @param invoiceId Invoice ID
   */
  private async updateInvoiceTotals(invoiceId: number): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items']
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    for (const item of invoice.items) {
      subtotal += item.quantity * item.unitPrice;
      taxAmount += item.taxAmount;
      totalAmount += item.totalAmount;
    }

    invoice.subtotal = Number(subtotal.toFixed(2));
    invoice.taxAmount = Number(taxAmount.toFixed(2));
    invoice.totalAmount = Number(totalAmount.toFixed(2));

    await this.invoiceRepository.save(invoice);
  }

  /**
   * Update invoice status
   * @param invoiceId Invoice ID
   * @param status New status
   */
  async updateInvoiceStatus(
    invoiceId: number,
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  ): Promise<Invoice> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = status;
    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Get overdue invoices
   * @param companyId Company ID
   */
  async getOverdueInvoices(companyId: number): Promise<Invoice[]> {
    const today = new Date();
    return await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.dueDate < :today', { today })
      .andWhere('invoice.status = :status', { status: 'SENT' })
      .orderBy('invoice.dueDate', 'ASC')
      .getMany();
  }
}