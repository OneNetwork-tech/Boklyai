import { AppDataSource } from './database';
import { AgencyAccount } from './AgencyAccount';
import { AgencyClient } from './AgencyClient';
import { Company } from './Company';

interface AgencyAccountInput {
  name: string;
  organizationNumber: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
}

interface AgencyClientInput {
  companyId?: number;
  name?: string;
  organizationNumber?: string;
  vatNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  engagementScope?: string;
}

export class AgencyService {
  private agencyRepository = AppDataSource.getRepository(AgencyAccount);
  private agencyClientRepository = AppDataSource.getRepository(AgencyClient);
  private companyRepository = AppDataSource.getRepository(Company);

  async createAgencyAccount(input: AgencyAccountInput): Promise<AgencyAccount> {
    const agency = new AgencyAccount();
    agency.name = input.name;
    agency.organizationNumber = input.organizationNumber;
    agency.contactEmail = input.contactEmail || '';
    agency.contactPhone = input.contactPhone || '';
    agency.website = input.website || '';
    agency.isActive = true;

    return this.agencyRepository.save(agency);
  }

  async getAgencies(): Promise<AgencyAccount[]> {
    return this.agencyRepository.find({ where: { isActive: true }, relations: ['clients', 'clients.company'] });
  }

  async getAgencyById(id: number): Promise<AgencyAccount | null> {
    return this.agencyRepository.findOne({ where: { id, isActive: true }, relations: ['clients', 'clients.company'] });
  }

  async addClientToAgency(agencyId: number, input: AgencyClientInput): Promise<AgencyClient> {
    const agency = await this.getAgencyById(agencyId);
    if (!agency) {
      throw new Error('Agency not found');
    }

    let company: Company | null = null;

    if (input.companyId) {
      company = await this.companyRepository.findOneBy({ id: input.companyId, isActive: true });
      if (!company) {
        throw new Error('Referenced company not found');
      }
    } else {
      if (!input.name || !input.organizationNumber) {
        throw new Error('New client requires name and organization number');
      }
      const newCompany = new Company();
      newCompany.name = input.name;
      newCompany.organizationNumber = input.organizationNumber;
      newCompany.vatNumber = input.vatNumber || '';
      newCompany.address = input.address || '';
      newCompany.postalCode = input.postalCode || '';
      newCompany.city = input.city || '';
      newCompany.country = input.country || 'Sweden';
      newCompany.isActive = true;
      company = await this.companyRepository.save(newCompany);
    }

    if (!company) {
      throw new Error('Unable to resolve company for agency client');
    }

    const existingLink = await this.agencyClientRepository.findOne({
      where: { agency: { id: agency.id }, company: { id: company.id } },
      relations: ['agency', 'company']
    });

    if (existingLink) {
      existingLink.contactName = input.contactName || existingLink.contactName;
      existingLink.contactEmail = input.contactEmail || existingLink.contactEmail;
      existingLink.contactPhone = input.contactPhone || existingLink.contactPhone;
      existingLink.engagementScope = input.engagementScope || existingLink.engagementScope;
      return this.agencyClientRepository.save(existingLink);
    }

    const agencyClient = new AgencyClient();
    agencyClient.agency = agency;
    agencyClient.company = company;
    agencyClient.contactName = input.contactName || '';
    agencyClient.contactEmail = input.contactEmail || '';
    agencyClient.contactPhone = input.contactPhone || '';
    agencyClient.engagementScope = input.engagementScope || '';

    return this.agencyClientRepository.save(agencyClient);
  }

  async getAgencyClients(agencyId: number): Promise<AgencyClient[]> {
    const agency = await this.getAgencyById(agencyId);
    if (!agency) {
      throw new Error('Agency not found');
    }
    return this.agencyClientRepository.find({
      where: { agency: { id: agencyId } },
      relations: ['agency', 'company']
    });
  }
}
