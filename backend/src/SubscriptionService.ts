import { AppDataSource } from './database';
import { SubscriptionPlan } from './SubscriptionPlan';
import { Subscription } from './Subscription';
import { Company } from './Company';

export class SubscriptionService {
  private planRepository = AppDataSource.getRepository(SubscriptionPlan);
  private subscriptionRepository = AppDataSource.getRepository(Subscription);
  private companyRepository = AppDataSource.getRepository(Company);

  async seedDefaultPlans(): Promise<void> {
    const existingPlans = await this.planRepository.count();
    if (existingPlans > 0) {
      return;
    }

    const plans = this.planRepository.create([
      {
        code: 'BASIC',
        name: 'Basic Bokföring',
        description:
          'Full core bookkeeping, automation and payroll without annual filings.',
        monthlyPrice: 49,
        yearlyPrice: 490,
        trialDays: 180,
        currency: 'SEK',
        featureSet: {
          includesAnnualReports: false,
          includesAnnualDeclarations: false,
          aiAutomation: true,
          bankFeeds: true,
          payroll: true
        }
      },
      {
        code: 'FULL',
        name: 'Full Professional',
        description: 'Complete suite including årsredovisning and årsdeklaration.',
        monthlyPrice: 99,
        yearlyPrice: 990,
        trialDays: 180,
        currency: 'SEK',
        featureSet: {
          includesAnnualReports: true,
          includesAnnualDeclarations: true,
          aiAutomation: true,
          bankFeeds: true,
          payroll: true
        }
      }
    ]);

    await this.planRepository.save(plans);
  }

  async listPlans(): Promise<SubscriptionPlan[]> {
    return await this.planRepository.find({ where: { isActive: true } });
  }

  async createSubscription(
    companyId: number,
    planCode: string,
    billingCycle: 'MONTHLY' | 'YEARLY'
  ): Promise<Subscription> {
    const [company, plan] = await Promise.all([
      this.companyRepository.findOne({ where: { id: companyId } }),
      this.planRepository.findOne({ where: { code: planCode, isActive: true } })
    ]);

    if (!company) {
      throw new Error('Company not found');
    }
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

    const subscription = this.subscriptionRepository.create({
      company,
      plan,
      billingCycle,
      status: 'TRIAL',
      startDate: now,
      trialEndsAt,
      nextBillingDate: trialEndsAt,
      seatCount: 1,
      entitlements: plan.featureSet
    });

    return await this.subscriptionRepository.save(subscription);
  }

  async upgradeSubscription(subscriptionId: number, planCode: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan']
    });
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = await this.planRepository.findOne({ where: { code: planCode } });
    if (!plan) {
      throw new Error('Target plan not found');
    }

    subscription.plan = plan;
    subscription.entitlements = plan.featureSet;
    subscription.status = 'ACTIVE';
    subscription.nextBillingDate = this.computeNextBillingDate(subscription.billingCycle);

    return await this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(subscriptionId: number): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'CANCELLED';
    subscription.nextBillingDate = null;
    return await this.subscriptionRepository.save(subscription);
  }

  async getCompanySubscription(companyId: number): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({
      where: { company: { id: companyId } },
      relations: ['plan']
    });
  }

  private computeNextBillingDate(cycle: 'MONTHLY' | 'YEARLY'): Date {
    const now = new Date();
    if (cycle === 'YEARLY') {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now;
  }
}
