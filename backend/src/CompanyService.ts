import { AppDataSource } from './database';
import { Company } from './Company';

export class CompanyService {
  private companyRepository = AppDataSource.getRepository(Company);

  /**
   * Create a new company
   * @param name Company name
   * @param organizationNumber Organization number
   * @param vatNumber VAT number (optional)
   * @param address Company address (optional)
   * @param postalCode Postal code (optional)
   * @param city City (optional)
   * @param country Country (optional)
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
    company.vatNumber = vatNumber;
    company.address = address;
    company.postalCode = postalCode;
    company.city = city;
    company.country = country;
    company.isActive = true;

    return await this.companyRepository.save(company);
  }

  /**
   * Get all companies
   */
  async getAllCompanies(): Promise<Company[]> {
    return await this.companyRepository.find({
      where: { isActive: true },
      relations: ['employees']
    });
  }

  /**
   * Get company by ID
   * @param id Company ID
   */
  async getCompanyById(id: number): Promise<Company | null> {
    return await this.companyRepository.findOne({
      where: { id, isActive: true },
      relations: ['employees']
    });
  }

  /**
   * Update company information
   * @param id Company ID
   * @param updateData Company update data
   */
  async updateCompany(id: number, updateData: Partial<Company>): Promise<Company | null> {
    const company = await this.companyRepository.findOneBy({ id, isActive: true });
    if (!company) {
      return null;
    }

    Object.assign(company, updateData);
    return await this.companyRepository.save(company);
  }
}