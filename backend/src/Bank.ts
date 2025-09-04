import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BankAccount } from './BankAccount';

@Entity('banks')
export class Bank {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  apiUrl!: string;

  @Column({ type: 'text', nullable: true })
  authType!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => BankAccount, bankAccount => bankAccount.bank)
  bankAccounts!: BankAccount[];
}