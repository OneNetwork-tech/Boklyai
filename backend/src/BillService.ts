import { AppDataSource } from './database';
import { Bill } from './Bill';
import { BillItem } from './BillItem';
import { Vendor } from './Vendor';
import { Company } from './Company';
import { Account } from './Account';

export class BillService {
  private billRepository = AppDataSource.getRepository(Bill);
  private billItemRepository = AppDataSource.getRepository(BillItem);
  private vendorRepository = AppDataSource.getRepository(Vendor);
  private companyRepository = AppDataSource.getRepository(Company);
  private accountRepository = AppDataSource.getRepository(Account);

  /**
   * Create a new vendor
   * @param name Vendor name
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
  async createVendor(
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
  ): Promise<Vendor> {
    // Check if vendor with this organization number already exists
    const existingVendor = await this.vendorRepository.findOneBy({ organizationNumber });
    if (existingVendor) {
      throw new Error('Vendor with this organization number already exists');
    }

    const vendor = new Vendor();
    vendor.name = name;
    vendor.organizationNumber = organizationNumber;
    vendor.vatNumber = vatNumber;
    vendor.contactPerson = contactPerson;
    vendor.email = email;
    vendor.phone = phone;
    vendor.address = address;
    vendor.postalCode = postalCode;
    vendor.city = city;
    vendor.country = country;
    vendor.notes = notes;
    vendor.isActive = true;

    return await this.vendorRepository.save(vendor);
  }

  /**
   * Get all vendors
   */
  async getAllVendors(): Promise<Vendor[]> {
    return await this.vendorRepository.find({
      where: { isActive: true }
    });
  }

  /**
   * Get vendor by ID
   * @param id Vendor ID
   */
  async getVendorById(id: number): Promise<Vendor | null> {
    return await this.vendorRepository.findOne({
      where: { id, isActive: true }
    });
  }

  /**
   * Create a new bill
   * @param companyId Company ID
   * @param vendorId Vendor ID
   * @param billNumber Bill number
   * @param billDate Bill date
   * @param dueDate Due date
   * @param reference Reference
   * @param notes Notes
   */
  async createBill(
    companyId: number,
    vendorId: number,
    billNumber: string,
    billDate: Date,
    dueDate: Date,
    reference?: string,
    notes?: string
  ): Promise<Bill> {
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    const vendor = await this.vendorRepository.findOneBy({ id: vendorId });
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Check if bill with this number already exists
    const existingBill = await this.billRepository.findOneBy({ billNumber });
    if (existingBill) {
      throw new Error('Bill with this number already exists');
    }

    const bill = new Bill();
    bill.company = company;
    bill.vendor = vendor;
    bill.billNumber = billNumber;
    bill.billDate = billDate;
    bill.dueDate = dueDate;
    bill.reference = reference;
    bill.notes = notes;
    bill.status = 'DRAFT';
    bill.subtotal = 0;
    bill.taxAmount = 0;
    bill.totalAmount = 0;

    return await this.billRepository.save(bill);
  }

  /**
   * Get all bills for a company
   * @param companyId Company ID
   */
  async getBillsByCompany(companyId: number): Promise<Bill[]> {
    return await this.billRepository.find({
      where: {
        company: { id: companyId }
      },
      relations: ['vendor'],
      order: {
        createdAt: 'DESC'
      }
    });
  }

  /**
   * Get bill by ID
   * @param id Bill ID
   */
  async getBillById(id: number): Promise<Bill | null> {
    return await this.billRepository.findOne({
      where: { id },
      relations: ['vendor', 'company', 'items', 'items.account']
    });
  }

  /**
   * Add item to bill
   * @param billId Bill ID
   * @param description Item description
   * @param quantity Quantity
   * @param unitPrice Unit price
   * @param taxRate Tax rate
   * @param accountId Account ID
   */
  async addBillItem(
    billId: number,
    description: string,
    quantity: number,
    unitPrice: number,
    taxRate: number,
    accountId: number
  ): Promise<BillItem> {
    const bill = await this.billRepository.findOneBy({ id: billId });
    if (!bill) {
      throw new Error('Bill not found');
    }

    const account = await this.accountRepository.findOneBy({ id: accountId });
    if (!account) {
      throw new Error('Account not found');
    }

    const billItem = new BillItem();
    billItem.bill = bill;
    billItem.description = description;
    billItem.quantity = quantity;
    billItem.unitPrice = unitPrice;
    billItem.taxRate = taxRate;
    billItem.taxAmount = Number((quantity * unitPrice * taxRate / 100).toFixed(2));
    billItem.totalAmount = Number((quantity * unitPrice + billItem.taxAmount).toFixed(2));

    const savedItem = await this.billItemRepository.save(billItem);

    // Update bill totals
    await this.updateBillTotals(billId);

    return savedItem;
  }

  /**
   * Update bill totals
   * @param billId Bill ID
   */
  private async updateBillTotals(billId: number): Promise<void> {
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ['items']
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    for (const item of bill.items) {
      subtotal += item.quantity * item.unitPrice;
      taxAmount += item.taxAmount;
      totalAmount += item.totalAmount;
    }

    bill.subtotal = Number(subtotal.toFixed(2));
    bill.taxAmount = Number(taxAmount.toFixed(2));
    bill.totalAmount = Number(totalAmount.toFixed(2));

    await this.billRepository.save(bill);
  }

  /**
   * Update bill status
   * @param billId Bill ID
   * @param status New status
   */
  async updateBillStatus(
    billId: number,
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  ): Promise<Bill> {
    const bill = await this.getBillById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    bill.status = status;
    return await this.billRepository.save(bill);
  }

  /**
   * Get overdue bills
   * @param companyId Company ID
   */
  async getOverdueBills(companyId: number): Promise<Bill[]> {
    const today = new Date();
    return await this.billRepository
      .createQueryBuilder('bill')
      .where('bill.companyId = :companyId', { companyId })
      .andWhere('bill.dueDate < :today', { today })
      .andWhere('bill.status = :status', { status: 'SENT' })
      .orderBy('bill.dueDate', 'ASC')
      .getMany();
  }
}