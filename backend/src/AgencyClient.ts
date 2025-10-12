import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne
} from 'typeorm';
import { AgencyAccount } from './AgencyAccount';
import { Company } from './Company';

/**
 * Links an agency account to a client company that the agency manages.
 */
@Entity('agency_clients')
export class AgencyClient {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AgencyAccount, agency => agency.clients, { onDelete: 'CASCADE' })
  agency!: AgencyAccount;

  @ManyToOne(() => Company, company => company.agencyClients, { eager: true, onDelete: 'CASCADE' })
  company!: Company;

  @Column({ nullable: true })
  contactName!: string;

  @Column({ nullable: true })
  contactEmail!: string;

  @Column({ nullable: true })
  contactPhone!: string;

  @Column({ nullable: true })
  engagementScope!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
