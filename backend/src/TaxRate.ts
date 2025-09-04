import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TaxRule } from './TaxRule';

@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate!: number;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  })
  status!: 'ACTIVE' | 'INACTIVE';

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => TaxRule, taxRule => taxRule.taxRate)
  taxRules!: TaxRule[];
}