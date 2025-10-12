import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { AgencyClient } from './AgencyClient';

/**
 * Represents an accounting agency (redovisningsbyrå) that manages
 * bookkeeping on behalf of multiple client companies.
 */
@Entity('agency_accounts')
export class AgencyAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  organizationNumber!: string;

  @Column({ nullable: true })
  contactEmail!: string;

  @Column({ nullable: true })
  contactPhone!: string;

  @Column({ nullable: true })
  website!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => AgencyClient, client => client.agency)
  clients!: AgencyClient[];
}
