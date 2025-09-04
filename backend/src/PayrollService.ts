import { AppDataSource } from './database';
import { Employee } from './Employee';
import { Payroll } from './Payroll';
import { PayrollItem } from './PayrollItem';
import { Company } from './Company';

export class PayrollService {
  private employeeRepository = AppDataSource.getRepository(Employee);
  private payrollRepository = AppDataSource.getRepository(Payroll);
  private payrollItemRepository = AppDataSource.getRepository(PayrollItem);

  /**
   * Create a new employee
   * @param companyId Company ID
   * @param firstName First name
   * @param lastName Last name
   * @param personalNumber Personal number
   * @param email Email
   * @param phone Phone
   * @param address Address
   * @param postalCode Postal code
   * @param city City
   * @param country Country
   * @param startDate Start date
   * @param salary Salary
   * @param position Position
   * @param notes Notes
   */
  async createEmployee(
    companyId: number,
    firstName: string,
    lastName: string,
    personalNumber: string,
    email?: string,
    phone?: string,
    address?: string,
    postalCode?: string,
    city?: string,
    country?: string,
    startDate?: Date,
    salary?: number,
    position?: string,
    notes?: string
  ): Promise<Employee> {
    const employee = new Employee();
    
    // Use relation object instead of direct ID
    employee.company = { id: companyId } as Company;
    
    employee.firstName = firstName;
    employee.lastName = lastName;
    employee.personalNumber = personalNumber;
    employee.email = email || '';
    employee.phone = phone || '';
    employee.address = address || '';
    employee.postalCode = postalCode || '';
    employee.city = city || '';
    employee.country = country || 'Sweden';
    employee.startDate = startDate || new Date();
    employee.salary = salary || 0;
    employee.position = position || '';
    employee.notes = notes || '';
    employee.status = 'ACTIVE';

    return await this.employeeRepository.save(employee);
  }

  /**
   * Get employees by company
   * @param companyId Company ID
   */
  async getEmployeesByCompany(companyId: number): Promise<Employee[]> {
    return await this.employeeRepository.find({ 
      where: { 
        company: { id: companyId }, 
        status: 'ACTIVE' 
      } 
    });
  }

  /**
   * Update employee status
   * @param employeeId Employee ID
   * @param status New status
   */
  async updateEmployeeStatus(employeeId: number, status: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOneBy({ id: employeeId });
    if (!employee) {
      throw new Error('Employee not found');
    }

    employee.status = status as 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
    if (status === 'TERMINATED') {
      employee.endDate = new Date();
    }

    return await this.employeeRepository.save(employee);
  }

  /**
   * Create a new payroll
   * @param companyId Company ID
   * @param name Payroll name
   * @param periodStart Period start date
   * @param periodEnd Period end date
   * @param paymentDate Payment date
   */
  async createPayroll(
    companyId: number,
    name: string,
    periodStart: Date,
    periodEnd: Date,
    paymentDate: Date
  ): Promise<Payroll> {
    const payroll = new Payroll();
    
    // Use relation object instead of direct ID
    payroll.company = { id: companyId } as Company;
    
    payroll.name = name;
    payroll.periodStart = periodStart;
    payroll.periodEnd = periodEnd;
    payroll.paymentDate = paymentDate;
    payroll.status = 'DRAFT';
    payroll.totalGrossSalary = 0;
    payroll.totalDeductions = 0;
    payroll.totalNetSalary = 0;
    payroll.notes = '';

    return await this.payrollRepository.save(payroll);
  }

  /**
   * Get payrolls by company
   * @param companyId Company ID
   */
  async getPayrollsByCompany(companyId: number): Promise<Payroll[]> {
    return await this.payrollRepository.find({
      where: { company: { id: companyId } },
      order: { periodStart: 'DESC' }
    });
  }

  /**
   * Update payroll status
   * @param payrollId Payroll ID
   * @param status New status
   */
  async updatePayrollStatus(payrollId: number, status: string): Promise<Payroll> {
    const payroll = await this.payrollRepository.findOneBy({ id: payrollId });
    if (!payroll) {
      throw new Error('Payroll not found');
    }

    payroll.status = status as 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'CANCELLED';
    return await this.payrollRepository.save(payroll);
  }

  /**
   * Add employee to payroll
   * @param payrollId Payroll ID
   * @param employeeId Employee ID
   * @param grossSalary Gross salary
   * @param preTaxDeductions Pre-tax deductions
   * @param postTaxDeductions Post-tax deductions
   */
  async addEmployeeToPayroll(
    payrollId: number,
    employeeId: number,
    grossSalary: number,
    preTaxDeductions?: number,
    postTaxDeductions?: number
  ): Promise<PayrollItem> {
    const payroll = await this.payrollRepository.findOneBy({ id: payrollId });
    if (!payroll) {
      throw new Error('Payroll not found');
    }

    const employee = await this.employeeRepository.findOneBy({ id: employeeId });
    if (!employee) {
      throw new Error('Employee not found');
    }

    const payrollItem = new PayrollItem();
    
    // Use relation objects instead of direct IDs
    payrollItem.payroll = payroll;
    payrollItem.employee = employee;
    
    payrollItem.grossSalary = grossSalary;
    payrollItem.preTaxDeductions = preTaxDeductions || 0;
    payrollItem.postTaxDeductions = postTaxDeductions || 0;

    // Calculate net salary
    const taxableIncome = grossSalary - (preTaxDeductions || 0);
    const taxAmount = taxableIncome * 0.3; // Mock tax calculation
    payrollItem.taxAmount = taxAmount;
    payrollItem.netSalary = grossSalary - taxAmount - (preTaxDeductions || 0) - (postTaxDeductions || 0);

    // Update payroll totals
    payroll.totalGrossSalary += grossSalary;
    payroll.totalDeductions += (preTaxDeductions || 0) + (postTaxDeductions || 0) + taxAmount;
    payroll.totalNetSalary += payrollItem.netSalary;

    await this.payrollRepository.save(payroll);
    return await this.payrollItemRepository.save(payrollItem);
  }

  /**
   * Generate payroll data
   * @param payrollId Payroll ID
   */
  async generatePayrollData(payrollId: number): Promise<Payroll> {
    const payroll = await this.payrollRepository.findOneBy({ id: payrollId });
    if (!payroll) {
      throw new Error('Payroll not found');
    }

    // Update the status to PROCESSED
    payroll.status = 'PROCESSED';

    return await this.payrollRepository.save(payroll);
  }
}