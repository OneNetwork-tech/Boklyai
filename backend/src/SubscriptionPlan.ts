import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { Subscription } from './Subscription';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  yearlyPrice!: number;

  @Column({ type: 'varchar', length: 3, default: 'SEK' })
  currency!: string;

  @Column({ type: 'int', default: 180 })
  trialDays!: number;

  @Column({ type: 'jsonb' })
  featureSet!: {
    includesAnnualReports: boolean;
    includesAnnualDeclarations: boolean;
    aiAutomation: boolean;
    bankFeeds: boolean;
    payroll: boolean;
  };

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions!: Subscription[];
}
