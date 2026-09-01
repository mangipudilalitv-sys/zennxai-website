import { GoalRepository } from "@/lib/repositories/goal-repository";

export class GoalService {
  private readonly goals =
    new GoalRepository();

  async getOrCreate(customerId: string) {
    const existing =
      await this.goals.findByCustomerId(
        customerId,
      );

    if (existing) {
      return existing;
    }

    return this.goals.create({
      customer_id: customerId,
      goal: "BOOK_QUALIFIED_ESTIMATE",
      priority: 100,
      status: "ACTIVE",
    });
  }

  async update(
    id: string,
    updates: Record<string, unknown>,
  ) {
    return this.goals.update(id, updates);
  }
}