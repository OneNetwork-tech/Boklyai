import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from './Company';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // For BankID integration, we'll add BankID-specific fields later
  @Column({ nullable: true })
  bankIdSessionId!: string;

  @Column({ nullable: true })
  bankIdPersonNumber!: string;

  @ManyToOne(() => Company, company => company.employees, { nullable: true })
  company!: Company;
}