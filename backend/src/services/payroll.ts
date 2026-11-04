/**
 * Payroll calculations.
 *
 * Preliminary tax uses the employee's tax percentage (from their tax table /
 * jämkning) and is rounded down to whole kronor, as Skatteverket's tables are.
 * Employer contributions (arbetsgivaravgifter) for 2025–2026:
 *   - 31.42 %  standard
 *   - 10.21 %  only ålderspensionsavgift, for people who turned 66 before the year began
 *   - 0 %      born 1937 or earlier
 * Other special rates (e.g. temporary youth reductions or växa-stöd) can be
 * applied by overriding the rate on the payslip.
 */
import { ageOn } from '../utils/dates';
import { birthDateFromPersonalNumber } from '../utils/swedish';

export const STANDARD_EMPLOYER_FEE = 31.42;
export const SENIOR_EMPLOYER_FEE = 10.21;

export function employerFeeRate(personalNumber: string, payYear: number): number {
  const birth = birthDateFromPersonalNumber(personalNumber);
  if (birth.getUTCFullYear() <= 1937) return 0;
  if (ageOn(birth, `${payYear}-01-01`) >= 66) return SENIOR_EMPLOYER_FEE;
  return STANDARD_EMPLOYER_FEE;
}

export interface PayslipCalc {
  baseSalary: number;
  additions: number;
  deductions: number;
  gross: number;
  taxRate: number;
  tax: number;
  net: number;
  employerFeeRate: number;
  employerFee: number;
}

export function calculatePayslip(input: {
  baseSalary: number;
  additions?: number;
  deductions?: number;
  taxRate: number;
  employerFeeRate: number;
  taxOverride?: number | null;
}): PayslipCalc {
  const additions = input.additions ?? 0;
  const deductions = input.deductions ?? 0;
  const gross = input.baseSalary + additions;
  if (gross < 0) throw new Error('Gross salary cannot be negative');
  const tax = input.taxOverride ?? Math.floor((gross * input.taxRate) / 100 / 100) * 100;
  const employerFee = Math.round((gross * input.employerFeeRate) / 100);
  const net = gross - tax - deductions;
  if (net < 0) throw new Error('Net salary cannot be negative; reduce the deductions');
  return {
    baseSalary: input.baseSalary, additions, deductions, gross, taxRate: input.taxRate, tax, net, employerFeeRate: input.employerFeeRate, employerFee,
  };
}
