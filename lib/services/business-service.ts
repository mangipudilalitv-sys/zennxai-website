import { BusinessRepository } from "@/lib/repositories/business-repository";

export class BusinessService {
  private readonly business =
    new BusinessRepository();

  async getOrCreate(
    businessId: string,
  ) {
    const existing =
      await this.business.get(
        businessId,
      );

    if (existing) {
      return existing;
    }

    return this.business.create({
      business_id: businessId,
      open_leads: 0,
      active_tasks: 0,
      revenue: 0,
      missed_calls: 0,
    });
  }

  async update(
    id: string,
    updates: Record<string, unknown>,
  ) {
    return this.business.update(
      id,
      updates,
    );
  }
}