import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from './Company';

@Entity('kpis')
export class Kpi {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  currentValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  previousValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  targetValue!: number;

  @Column({ type: 'text', nullable: true })
  unit!: string;

  @Column({ type: 'text', nullable: true })
  category!: string;

  @Column({ type: 'jsonb', nullable: true })
  calculationParams!: any;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Company, company => company.kpis)
  company!: Company;
}