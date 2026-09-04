import { SmsExecutor } from "../lib/employee/execution/sms-executor";

async function main() {
  const to = process.env.TEST_CUSTOMER_PHONE;

  if (!to) {
    throw new Error("TEST_CUSTOMER_PHONE is missing.");
  }

  const sms = new SmsExecutor();

  const businessId =
    process.env.DEFAULT_BUSINESS_ID;

  if (!businessId) {
    throw new Error(
      "Missing DEFAULT_BUSINESS_ID."
    );
  }

  const result = await sms.send({
    businessId,
    to,
    message: "ZennX SMS test: if you received this, Twilio outbound messaging is working.",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
