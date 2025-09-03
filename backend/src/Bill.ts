import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Vendor } from './Vendor';
import { BillItem } from './BillItem';
import { Company } from './Company';

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  billNumber!: string;

  @Column({ type: 'text', nullable: true })
  reference!: string;

  @Column({ type: 'date' })
  billDate!: Date;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT'
  })
  status!: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Vendor, vendor => vendor.bills)
  vendor!: Vendor;

  @ManyToOne(() => Company, company => company.bills)
  company!: Company;

  @OneToMany(() => BillItem, billItem => billItem.bill)
  items!: BillItem[];
}