"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const database_1 = require("./database");
const Company_1 = require("./Company");
class CompanyService {
    constructor() {
        this.companyRepository = database_1.AppDataSource.getRepository(Company_1.Company);
    }
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
    async createCompany(name, organizationNumber, vatNumber, address, postalCode, city, country) {
        const company = new Company_1.Company();
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
    async getAllCompanies() {
        return await this.companyRepository.find({ where: { isActive: true } });
    }
    /**
     * Get company by ID
     * @param id Company ID
     */
    async getCompanyById(id) {
        return await this.companyRepository.findOneBy({ id, isActive: true });
    }
}
exports.CompanyService = CompanyService;
//# sourceMappingURL=CompanyService.js.map