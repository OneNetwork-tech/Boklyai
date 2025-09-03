import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from './Company';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  filename!: string;

  @Column()
  originalName!: string;

  @Column()
  mimeType!: string;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ nullable: true })
  filePath!: string;

  @Column({ type: 'text', nullable: true })
  ocrText!: string;

  @Column({
    type: 'enum',
    enum: ['RECEIPT', 'INVOICE', 'BANK_STATEMENT', 'CONTRACT', 'OTHER'],
    default: 'OTHER'
  })
  documentType!: 'RECEIPT' | 'INVOICE' | 'BANK_STATEMENT' | 'CONTRACT' | 'OTHER';

  @Column({
    type: 'enum',
    enum: ['UPLOADED', 'PROCESSING', 'PROCESSED', 'ERROR'],
    default: 'UPLOADED'
  })
  status!: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, company => company.documents, { nullable: false })
  company!: Company;
}