import { AppDataSource } from './database';
import { Company } from './Company';

export class CompanyService {
  private companyRepository = AppDataSource.getRepository(Company);

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
  async createCompany(
    name: string,
    organizationNumber: string,
    vatNumber?: string,
    address?: string,
    postalCode?: string,
    city?: string,
    country?: string
  ): Promise<Company> {
    const company = new Company();
    company.name = name;
    company.organizationNumber = organizationNumber;
    company.vatNumber = vatNumber || '';
    company.address = address || '';
    company.postalCode = postalCode || '';
    company.city = city || '';
    company.country = country || 'Sweden';
    company.isActive = true;

    return await this.companyRepository.save(company);
  }

  /**
   * Get all companies
   */
  async getAllCompanies(): Promise<Company[]> {
    return await this.companyRepository.find({ where: { isActive: true } });
  }

  /**
   * Get company by ID
   * @param id Company ID
   */
  async getCompanyById(id: number): Promise<Company | null> {
    return await this.companyRepository.findOneBy({ id, isActive: true });
  }
}