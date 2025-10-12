"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const database_1 = require("./database");
const Employee_1 = require("./Employee");
const Payroll_1 = require("./Payroll");
const PayrollItem_1 = require("./PayrollItem");
class PayrollService {
    constructor() {
        this.employeeRepository = database_1.AppDataSource.getRepository(Employee_1.Employee);
        this.payrollRepository = database_1.AppDataSource.getRepository(Payroll_1.Payroll);
        this.payrollItemRepository = database_1.AppDataSource.getRepository(PayrollItem_1.PayrollItem);
    }
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
    async createEmployee(companyId, firstName, lastName, personalNumber, email, phone, address, postalCode, city, country, startDate, salary, position, notes) {
        const employee = new Employee_1.Employee();
        // Use relation object instead of direct ID
        employee.company = { id: companyId };
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
    async getEmployeesByCompany(companyId) {
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
    async updateEmployeeStatus(employeeId, status) {
        const employee = await this.employeeRepository.findOneBy({ id: employeeId });
        if (!employee) {
            throw new Error('Employee not found');
        }
        employee.status = status;
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
    async createPayroll(companyId, name, periodStart, periodEnd, paymentDate) {
        const payroll = new Payroll_1.Payroll();
        // Use relation object instead of direct ID
        payroll.company = { id: companyId };
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
    async getPayrollsByCompany(companyId) {
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
    async updatePayrollStatus(payrollId, status) {
        const payroll = await this.payrollRepository.findOneBy({ id: payrollId });
        if (!payroll) {
            throw new Error('Payroll not found');
        }
        payroll.status = status;
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
    async addEmployeeToPayroll(payrollId, employeeId, grossSalary, preTaxDeductions, postTaxDeductions) {
        const payroll = await this.payrollRepository.findOneBy({ id: payrollId });
        if (!payroll) {
            throw new Error('Payroll not found');
        }
        const employee = await this.employeeRepository.findOneBy({ id: employeeId });
        if (!employee) {
            throw new Error('Employee not found');
        }
        const payrollItem = new PayrollItem_1.PayrollItem();
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
    async generatePayrollData(payrollId) {
        const payroll = await this.payrollRepository.findOneBy({ id: payrollId });
        if (!payroll) {
            throw new Error('Payroll not found');
        }
        // Update the status to PROCESSED
        payroll.status = 'PROCESSED';
        return await this.payrollRepository.save(payroll);
    }
}
exports.PayrollService = PayrollService;
//# sourceMappingURL=PayrollService.js.map