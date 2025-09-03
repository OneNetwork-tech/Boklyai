import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Document } from './Document';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  organizationNumber!: string;

  @Column({ nullable: true })
  vatNumber!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  postalCode!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => User, user => user.company)
  employees!: User[];

  @OneToMany(() => Document, document => document.company)
  documents!: Document[];
}