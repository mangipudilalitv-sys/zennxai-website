export interface LearningRecord {
  id: string;

  customerId?: string;

  workflow: string;

  action: string;

  success: boolean;

  confidence: number;

  outcome: string;

  timestamp: string;
}

export interface LearningInsight {
  workflow: string;

  executions: number;

  successes: number;

  successRate: number;
}

export class LearningEngine {
  private readonly history: LearningRecord[] = [];

  public record(
    record: Omit<LearningRecord, "id" | "timestamp">,
  ) {
    this.history.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...record,
    });
  }

  public getHistory() {
    return this.history;
  }

  public analyze(): LearningInsight[] {
    const grouped = new Map<
      string,
      LearningRecord[]
    >();

    for (const record of this.history) {
      const list =
        grouped.get(record.workflow) ?? [];

      list.push(record);

      grouped.set(record.workflow, list);
    }

    return [...grouped.entries()].map(
      ([workflow, records]) => {

        const successes =
          records.filter(
            (r) => r.success,
          ).length;

        return {
          workflow,

          executions: records.length,

          successes,

          successRate:
            successes / records.length,
        };

      },
    );
  }
}