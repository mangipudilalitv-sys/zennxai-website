import { LearningRepository } from "@/lib/repositories/learning-repository";

export class LearningService {
  private readonly learning =
    new LearningRepository();

  async record(input: {
    customerId: string;
    action: string;
    outcome: string;
    confidence: number;
  }) {
    return this.learning.create({
      customer_id: input.customerId,
      action: input.action,
      outcome: input.outcome,
      confidence: input.confidence,
    });
  }
}