import { Employee } from './Employee';
import { Payroll } from './Payroll';
import { PayrollItem } from './PayrollItem';
export declare class PayrollService {
    private employeeRepository;
    private payrollRepository;
    private payrollItemRepository;
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
    createEmployee(companyId: number, firstName: string, lastName: string, personalNumber: string, email?: string, phone?: string, address?: string, postalCode?: string, city?: string, country?: string, startDate?: Date, salary?: number, position?: string, notes?: string): Promise<Employee>;
    /**
     * Get employees by company
     * @param companyId Company ID
     */
    getEmployeesByCompany(companyId: number): Promise<Employee[]>;
    /**
     * Update employee status
     * @param employeeId Employee ID
     * @param status New status
     */
    updateEmployeeStatus(employeeId: number, status: string): Promise<Employee>;
    /**
     * Create a new payroll
     * @param companyId Company ID
     * @param name Payroll name
     * @param periodStart Period start date
     * @param periodEnd Period end date
     * @param paymentDate Payment date
     */
    createPayroll(companyId: number, name: string, periodStart: Date, periodEnd: Date, paymentDate: Date): Promise<Payroll>;
    /**
     * Get payrolls by company
     * @param companyId Company ID
     */
    getPayrollsByCompany(companyId: number): Promise<Payroll[]>;
    /**
     * Update payroll status
     * @param payrollId Payroll ID
     * @param status New status
     */
    updatePayrollStatus(payrollId: number, status: string): Promise<Payroll>;
    /**
     * Add employee to payroll
     * @param payrollId Payroll ID
     * @param employeeId Employee ID
     * @param grossSalary Gross salary
     * @param preTaxDeductions Pre-tax deductions
     * @param postTaxDeductions Post-tax deductions
     */
    addEmployeeToPayroll(payrollId: number, employeeId: number, grossSalary: number, preTaxDeductions?: number, postTaxDeductions?: number): Promise<PayrollItem>;
    /**
     * Generate payroll data
     * @param payrollId Payroll ID
     */
    generatePayrollData(payrollId: number): Promise<Payroll>;
}
//# sourceMappingURL=PayrollService.d.ts.map