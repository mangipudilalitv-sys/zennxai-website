import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const {
    supabaseServer,
  } = await import(
    "../app/lib/supabase-server"
  );

  const {
    SmsConsentService,
  } = await import(
    "../lib/services/sms-consent-service"
  );

  const {
    TaskWorker,
  } = await import(
    "../lib/employee/workers/task-worker"
  );

  const {
    FollowUpWorker,
  } = await import(
    "../lib/employee/workers/followup-worker"
  );

  const businessId =
    process.env.DEFAULT_BUSINESS_ID;

  if (!businessId) {
    throw new Error(
      "Missing DEFAULT_BUSINESS_ID."
    );
  }

  const phone = "+15555550198";

  console.log(
    "=== WORKER SMS SUPPRESSION TEST ==="
  );

  /*
   * Create an isolated test customer because
   * follow_ups requires a real customer_id.
   */
  /*
   * Remove a stale customer from a previous interrupted
   * test, then create a fresh isolated record.
   */
  await supabaseServer
    .from("customers")
    .delete()
    .eq("business_id", businessId)
    .eq("phone", phone);

  const { data: customer, error: customerError } =
    await supabaseServer
      .from("customers")
      .insert({
        business_id: businessId,
        phone,
        name: "Worker Suppression Test",
      })
      .select()
      .single();

  if (customerError || !customer) {
    throw customerError ??
      new Error(
        "Failed to create test customer."
      );
  }

  const customerId = customer.id;

  console.log({
    customerId,
    phone,
  });

  /*
   * Durable opt-out BEFORE any worker execution.
   */
  const consent =
    new SmsConsentService();

  await consent.unsubscribe(
    businessId,
    phone,
  );

  const allowed =
    await consent.canSend(
      businessId,
      phone,
    );

  if (allowed !== false) {
    throw new Error(
      "FAIL: test phone is not opted out."
    );
  }

  console.log(
    "PASS: test customer is opted out."
  );

  const now =
    new Date(
      Date.now() - 60_000
    ).toISOString();

  /*
   * Create one due SEND_SMS task.
   */
  const {
    data: task,
    error: taskError,
  } = await supabaseServer
    .from("tasks")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      status: "scheduled",
      action_type: "SEND_SMS",
      description:
        "Worker suppression test task",
      payload: {
        to: phone,
        message:
          "THIS TASK MUST NEVER REACH TWILIO",
      },
      due_date: now,
      next_attempt_at: now,
      attempt_count: 0,
      max_attempts: 3,
    })
    .select()
    .single();

  if (taskError || !task) {
    throw taskError ??
      new Error(
        "Failed to create test task."
      );
  }

  /*
   * Create one due follow-up.
   */
  const {
    data: followUp,
    error: followUpError,
  } = await supabaseServer
    .from("follow_ups")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      phone,
      customer_name:
        "Worker Suppression Test",
      service_type: "test",
      reason:
        "Worker suppression behavior test",
      status: "scheduled",
      scheduled_for: now,
      attempt_count: 0,
    })
    .select()
    .single();

  if (followUpError || !followUp) {
    throw followUpError ??
      new Error(
        "Failed to create test follow-up."
      );
  }

  console.log({
    taskId: task.id,
    followUpId: followUp.id,
  });

  console.log(
    "\n=== FIRST WORKER RUN ==="
  );

  const taskWorker =
    new TaskWorker();

  const followUpWorker =
    new FollowUpWorker();

  const firstTaskRun =
    await taskWorker.run();

  const firstFollowUpRun =
    await followUpWorker.run();

  console.log(
    "TASK WORKER:",
    JSON.stringify(
      firstTaskRun,
      null,
      2,
    ),
  );

  console.log(
    "FOLLOW-UP WORKER:",
    JSON.stringify(
      firstFollowUpRun,
      null,
      2,
    ),
  );

  const {
    data: taskAfter,
    error: taskReadError,
  } = await supabaseServer
    .from("tasks")
    .select(
      "id,status,attempt_count,next_attempt_at,error_message"
    )
    .eq("id", task.id)
    .single();

  if (taskReadError) {
    throw taskReadError;
  }

  const {
    data: followUpAfter,
    error: followUpReadError,
  } = await supabaseServer
    .from("follow_ups")
    .select(
      "id,status,attempt_count,scheduled_for,error_message"
    )
    .eq("id", followUp.id)
    .single();

  if (followUpReadError) {
    throw followUpReadError;
  }

  console.log(
    "\n=== DURABLE STATUS ==="
  );

  console.log({
    taskAfter,
    followUpAfter,
  });

  if (
    taskAfter.status !==
    "cancelled"
  ) {
    throw new Error(
      `FAIL: task status is ${taskAfter.status}, expected cancelled.`
    );
  }

  if (
    followUpAfter.status !==
    "cancelled"
  ) {
    throw new Error(
      `FAIL: follow-up status is ${followUpAfter.status}, expected cancelled.`
    );
  }

  console.log(
    "PASS: task cancelled."
  );

  console.log(
    "PASS: follow-up cancelled."
  );

  /*
   * Run workers again.
   * Cancelled records must not be reclaimed.
   */
  console.log(
    "\n=== SECOND WORKER RUN ==="
  );

  const secondTaskRun =
    await taskWorker.run();

  const secondFollowUpRun =
    await followUpWorker.run();

  const taskReclaimed =
    secondTaskRun.results.some(
      result =>
        result.id === task.id,
    );

  const followUpReclaimed =
    secondFollowUpRun.results.some(
      result =>
        result.id === followUp.id,
    );

  console.log({
    taskReclaimed,
    followUpReclaimed,
  });

  if (taskReclaimed) {
    throw new Error(
      "FAIL: cancelled task was reclaimed."
    );
  }

  if (followUpReclaimed) {
    throw new Error(
      "FAIL: cancelled follow-up was reclaimed."
    );
  }

  console.log(
    "PASS: cancelled task was not retried."
  );

  console.log(
    "PASS: cancelled follow-up was not retried."
  );

  console.log(
    "\n=== WORKER SUPPRESSION TEST PASSED ==="
  );

  /*
   * Cleanup only our temporary test records.
   */
  await supabaseServer
    .from("follow_ups")
    .delete()
    .eq("id", followUp.id);

  await supabaseServer
    .from("tasks")
    .delete()
    .eq("id", task.id);

  await supabaseServer
    .from("sms_consents")
    .delete()
    .eq("business_id", businessId)
    .eq("phone", phone);

  await supabaseServer
    .from("customers")
    .delete()
    .eq("id", customerId);

  console.log(
    "Test records cleaned up."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
