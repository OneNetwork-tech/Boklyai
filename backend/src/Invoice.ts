import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Customer } from './Customer';
import { InvoiceItem } from './InvoiceItem';
import { Company } from './Company';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  invoiceNumber!: string;

  @Column({ type: 'text', nullable: true })
  reference!: string;

  @Column({ type: 'date' })
  invoiceDate!: Date;

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

  @Column({ default: false })
  isEInvoice!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Customer, customer => customer.invoices)
  customer!: Customer;

  @ManyToOne(() => Company, company => company.invoices)
  company!: Company;

  @OneToMany(() => InvoiceItem, invoiceItem => invoiceItem.invoice)
  items!: InvoiceItem[];
}