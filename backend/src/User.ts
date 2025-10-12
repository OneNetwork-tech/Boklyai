import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Company } from './Company';
import { Role } from './Role';
import { AuditLog } from './AuditLog';
import * as bcrypt from 'bcrypt';

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

  @Column({ nullable: true })
  phone!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ nullable: true })
  lastLoginAt!: Date;

  @Column({ nullable: true })
  passwordResetToken!: string;

  @Column({ nullable: true })
  passwordResetExpires!: Date;

  @Column({ nullable: true })
  twoFactorSecret!: string;

  @Column({ default: false })
  twoFactorEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, company => company.employees)
  company!: Company;

  @ManyToOne(() => Role, role => role.users)
  role!: Role;

  @OneToMany(() => AuditLog, auditLog => auditLog.user)
  auditLogs!: AuditLog[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash if password is modified or new
    if (this.password) {
      // Check if already hashed (starts with $2b$)
      if (!this.password.startsWith('$2b$')) {
        this.password = await bcrypt.hash(this.password, 12);
      }
    }
  }

  // Method to validate password
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}