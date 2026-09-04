import { supabaseServer } from "../app/lib/supabase-server";
import { BusinessCommunicationService } from "../lib/services/business-communication-service";
import { TaskService } from "../lib/services/task-service";
import { TaskWorker } from "../lib/employee/workers/task-worker";

async function main() {
  const businessId = process.env.DEFAULT_BUSINESS_ID;

  if (!businessId) {
    throw new Error("Missing DEFAULT_BUSINESS_ID.");
  }

  const communications =
    new BusinessCommunicationService();

  const routing =
    await communications.getByBusinessId(
      businessId,
    );

  if (!routing?.ownerPhoneNumber) {
    throw new Error(
      "No owner phone configured.",
    );
  }

  const tasks =
    new TaskService();

  console.log(
    "=== CREATE OWNER ESCALATION ===",
  );

  const task =
    await tasks.create({
      business_id: businessId,
      status: "scheduled",
      priority: "high",
      description:
        "ZennX controlled owner escalation test",
      action_type: "ESCALATE_OWNER",
      payload: {
        ownerPhoneNumber:
          routing.ownerPhoneNumber,
        customerName:
          "ZennX Test Customer",
        serviceType:
          "Emergency HVAC",
        urgency:
          "high",
        source:
          "controlled_test",
        request:
          "Controlled autonomous escalation test.",
        summary:
          "CONTROLLED TEST — high-priority customer needs owner attention. No action required.",
      },
    });

  console.log({
    taskId: task.id,
    initialStatus: task.status,
    businessIdMatches:
      task.business_id === businessId,
  });

  if (task.status !== "scheduled") {
    throw new Error(
      `Unexpected initial status: ${task.status}`,
    );
  }

  console.log(
    "=== RUN AUTONOMOUS TASK WORKER ===",
  );

  const worker =
    new TaskWorker();

  const result =
    await worker.run();

  console.log(
    JSON.stringify(result, null, 2),
  );

  const { data: finalTask, error } =
    await supabaseServer
      .from("tasks")
      .select(
        "id,business_id,status,action_type,result,error_message,attempt_count,completed_at",
      )
      .eq("id", task.id)
      .single();

  if (error) {
    throw error;
  }

  console.log(
    "=== FINAL TASK ===",
  );

  console.log(
    JSON.stringify(finalTask, null, 2),
  );

  const workerSawTask =
    result.results.some(
      item => item.id === task.id,
    );

  const completed =
    finalTask.status === "completed";

  const ownerNotified =
    finalTask.result &&
    typeof finalTask.result === "object" &&
    finalTask.result.ownerNotified === true;

  console.log(
    "=== ASSERTIONS ===",
  );

  console.log({
    workerSawTask,
    completed,
    ownerNotified,
    hasCompletedAt:
      Boolean(finalTask.completed_at),
    hasTwilioSid:
      Boolean(
        finalTask.result &&
        typeof finalTask.result === "object" &&
        finalTask.result.sid,
      ),
  });

  if (
    !workerSawTask ||
    !completed ||
    !ownerNotified
  ) {
    throw new Error(
      "Owner escalation lifecycle test failed.",
    );
  }

  console.log(
    "=== OWNER ESCALATION LIVE TEST PASSED ===",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
