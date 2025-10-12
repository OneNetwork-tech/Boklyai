import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Company } from './Company';
import { SubscriptionPlan } from './SubscriptionPlan';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Company, company => company.subscriptions)
  company!: Company;

  @ManyToOne(() => SubscriptionPlan, plan => plan.subscriptions)
  plan!: SubscriptionPlan;

  @Column({ type: 'enum', enum: ['MONTHLY', 'YEARLY'], default: 'MONTHLY' })
  billingCycle!: 'MONTHLY' | 'YEARLY';

  @Column({ type: 'enum', enum: ['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED'], default: 'TRIAL' })
  status!: 'TRIAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date', nullable: true })
  trialEndsAt!: Date | null;

  @Column({ type: 'date', nullable: true })
  nextBillingDate!: Date | null;

  @Column({ type: 'int', default: 1 })
  seatCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  entitlements!: Record<string, boolean> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
