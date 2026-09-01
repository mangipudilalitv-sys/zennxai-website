import { BaseRepository } from "./base-repository";

export class LearningRepository extends BaseRepository {
  private readonly TABLE =
    "learning_events";

  async create(event: {
    customer_id: string;
    action: string;
    outcome: string;
    confidence: number;
  }) {
    const { data, error } =
      await this.table(this.TABLE)
        .insert(event)
        .select()
        .single();

    if (error) throw error;

    return data;
  }
}