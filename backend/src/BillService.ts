import { AppDataSource } from './database';
import { Bill } from './Bill';
import { Vendor } from './Vendor';
import { Company } from './Company';

export class BillService {
  private billRepository = AppDataSource.getRepository(Bill);
  private vendorRepository = AppDataSource.getRepository(Vendor);

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
  async createBill(
    companyId: number,
    vendorId: number,
    billNumber: string,
    billDate: Date,
    dueDate: Date,
    amount: number,
    description?: string,
    reference?: string,
    notes?: string
  ): Promise<Bill> {
    const bill = new Bill();
    
    // Use relation objects instead of direct IDs
    bill.company = { id: companyId } as Company;
    bill.vendor = { id: vendorId } as Vendor;
    
    bill.billNumber = billNumber;
    bill.billDate = billDate;
    bill.dueDate = dueDate;
    bill.totalAmount = amount;
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
  async getBillsByCompany(companyId: number): Promise<Bill[]> {
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
  async updateBillStatus(billId: number, status: string): Promise<Bill> {
    const bill = await this.billRepository.findOneBy({ id: billId });
    if (!bill) {
      throw new Error('Bill not found');
    }

    bill.status = status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    return await this.billRepository.save(bill);
  }

  /**
   * Mark bill as paid
   * @param billId Bill ID
   * @param paymentDate Payment date
   * @param paymentMethod Payment method
   */
  async markBillAsPaid(billId: number, paymentDate: Date, paymentMethod: string): Promise<Bill> {
    const bill = await this.billRepository.findOneBy({ id: billId });
    if (!bill) {
      throw new Error('Bill not found');
    }

    bill.status = 'PAID';
    // Removed paymentDate and paymentMethod assignments as they don't exist in the entity

    return await this.billRepository.save(bill);
  }

  /**
   * Get overdue bills
   * @param companyId Company ID
   */
  async getOverdueBills(companyId: number): Promise<Bill[]> {
    const today = new Date();
    return await this.billRepository.find({
      where: {
        company: { id: companyId },
        status: 'SENT',
        dueDate: { $lt: today } as any
      },
      relations: ['vendor']
    });
  }

  /**
   * Get bills by vendor
   * @param vendorId Vendor ID
   */
  async getBillsByVendor(vendorId: number): Promise<Bill[]> {
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
  async deleteBill(billId: number): Promise<boolean> {
    const result = await this.billRepository.delete(billId);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get bill statistics
   * @param companyId Company ID
   */
  async getBillStatistics(companyId: number): Promise<{
    total: number;
    paid: number;
    overdue: number;
    draft: number;
    totalAmount: number;
  }> {
    const bills = await this.getBillsByCompany(companyId);
    
    const total = bills.length;
    const paid = bills.filter(b => b.status === 'PAID').length;
    const overdue = bills.filter(b => b.status === 'OVERDUE').length;
    const draft = bills.filter(b => b.status === 'DRAFT').length;
    const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);

    return { total, paid, overdue, draft, totalAmount };
  }

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
  async createVendor(
    companyId: number,
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
  ): Promise<Vendor> {
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
    return await this.vendorRepository.find({ where: { isActive: true } });
  }

  /**
   * Get vendor by ID
   * @param id Vendor ID
   */
  async getVendorById(id: number): Promise<Vendor | null> {
    return await this.vendorRepository.findOneBy({ id, isActive: true });
  }
}