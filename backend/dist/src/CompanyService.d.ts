import { Company } from './Company';
export declare class CompanyService {
    private companyRepository;
    /**
     * Create a new company
     * @param name Company name
     * @param organizationNumber Organization number
     * @param vatNumber VAT number
     * @param address Company address
     * @param postalCode Postal code
     * @param city City
     * @param country Country
     */
    createCompany(name: string, organizationNumber: string, vatNumber?: string, address?: string, postalCode?: string, city?: string, country?: string): Promise<Company>;
    /**
     * Get all companies
     */
    getAllCompanies(): Promise<Company[]>;
    /**
     * Get company by ID
     * @param id Company ID
     */
    getCompanyById(id: number): Promise<Company | null>;
}
//# sourceMappingURL=CompanyService.d.ts.map