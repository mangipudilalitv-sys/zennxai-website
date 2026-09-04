import { LearningService } from "../lib/services/learning-service";
import { LearningRepository } from "../lib/repositories/learning-repository";
import { EmployeeBrain } from "../lib/employee/employee-brain";

async function main() {
  const businessId =
    process.env.DEFAULT_BUSINESS_ID;

  if (!businessId) {
    throw new Error(
      "DEFAULT_BUSINESS_ID is required.",
    );
  }

  const service =
    new LearningService();

  const repository =
    new LearningRepository();

  const brain =
    new EmployeeBrain();

  const action =
    `DURABLE_LEARNING_TEST_${Date.now()}`;

  const createdIds: string[] = [];

  try {
    for (let index = 0; index < 3; index += 1) {
      const row =
        await service.record({
          businessId,
          customerId: null,
          action,
          outcome: "completed",
          confidence: 1,
        });

      createdIds.push(row.id);
    }

    const evidence =
      await service.getActionEvidence(
        businessId,
        action,
      );

    console.log(
      "Durable evidence:",
      evidence,
    );

    if (
      evidence.executions !== 3 ||
      evidence.successes !== 3 ||
      evidence.failures !== 0 ||
      evidence.successRate !== 1 ||
      evidence.scoreAdjustment !== 10
    ) {
      throw new Error(
        "Durable evidence calculation failed.",
      );
    }

    const decision =
      brain.decide({
        message: "Hello",
        qualificationComplete: false,
        confidence: 100,
        actionLearning: {
          RESPOND: {
            action: "RESPOND",
            executions: 3,
            successes: 3,
            failures: 0,
            successRate: 1,
            scoreAdjustment: 10,
          },
        },
      });

    console.log(
      "Learning-adjusted decision:",
      decision,
    );

    if (
      decision.action !== "RESPOND" ||
      decision.score !== 20 ||
      !decision.reasoning.some(
        (reason) =>
          reason.includes(
            "Durable learning adjusted RESPOND by +10",
          ),
      )
    ) {
      throw new Error(
        "EmployeeBrain did not apply durable learning.",
      );
    }

    console.log(
      "DURABLE LEARNING TEST PASSED",
    );
  } finally {
    await repository.deleteByIds(
      createdIds,
    );

    console.log(
      `Cleaned up ${createdIds.length} test learning events.`,
    );
  }
}

main().catch((error) => {
  console.error(
    "DURABLE LEARNING TEST FAILED:",
    error,
  );

  process.exit(1);
});
