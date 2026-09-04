import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const {
    SmsConsentService,
  } = await import(
    "../lib/services/sms-consent-service"
  );

  const {
    SmsExecutor,
  } = await import(
    "../lib/employee/execution/sms-executor"
  );

  const businessId =
    process.env.DEFAULT_BUSINESS_ID;

  if (!businessId) {
    throw new Error(
      "Missing DEFAULT_BUSINESS_ID."
    );
  }

  const phone = "+15555550199";

  const consent =
    new SmsConsentService();

  const sms =
    new SmsExecutor();

  console.log("=== 1. UNSUBSCRIBE ===");

  await consent.unsubscribe(
    businessId,
    phone,
  );

  const afterStop =
    await consent.canSend(
      businessId,
      phone,
    );

  console.log({ afterStop });

  if (afterStop !== false) {
    throw new Error(
      "FAIL: unsubscribe did not block SMS."
    );
  }

  console.log(
    "PASS: durable opt-out blocks sending."
  );

  console.log(
    "\n=== 2. EXECUTOR SUPPRESSION ==="
  );

  const blocked =
    await sms.send({
      businessId,
      to: phone,
      message:
        "THIS MUST NEVER REACH TWILIO",
    });

  console.log(blocked);

  if (
    blocked.success !== false ||
    blocked.blocked !== true ||
    blocked.status !== "suppressed"
  ) {
    throw new Error(
      "FAIL: SmsExecutor did not suppress opted-out customer."
    );
  }

  console.log(
    "PASS: SmsExecutor suppressed before Twilio."
  );

  console.log(
    "\n=== 3. RESUBSCRIBE ==="
  );

  await consent.subscribe(
    businessId,
    phone,
  );

  const afterStart =
    await consent.canSend(
      businessId,
      phone,
    );

  console.log({ afterStart });

  if (afterStart !== true) {
    throw new Error(
      "FAIL: resubscribe did not restore eligibility."
    );
  }

  console.log(
    "PASS: START restores SMS eligibility."
  );

  console.log(
    "\n=== CONSENT TEST PASSED ==="
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
