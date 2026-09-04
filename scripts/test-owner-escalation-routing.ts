
import {
  BusinessCommunicationService,
} from "../lib/services/business-communication-service";

async function main() {
  const businessId =
    process.env.DEFAULT_BUSINESS_ID;

  if (!businessId) {
    throw new Error(
      "DEFAULT_BUSINESS_ID is required.",
    );
  }

  const communications =
    new BusinessCommunicationService();

  const routing =
    await communications.getByBusinessId(
      businessId,
    );

  if (!routing) {
    throw new Error(
      "Default business routing was not resolved.",
    );
  }

  console.log("=== OWNER ESCALATION ROUTING ===");
  console.log({
    businessIdMatches:
      routing.businessId === businessId,
    twilioConfigured:
      Boolean(routing.twilioPhoneNumber),
    ownerPhoneConfigured:
      Boolean(routing.ownerPhoneNumber),
  });

  if (routing.businessId !== businessId) {
    throw new Error(
      "Resolved business ID does not match DEFAULT_BUSINESS_ID.",
    );
  }

  if (!routing.ownerPhoneNumber) {
    throw new Error(
      "No owner phone resolved. Configure ownerPhoneNumber in business metadata or OWNER_PHONE_NUMBER for the default business.",
    );
  }

  console.log(
    "=== OWNER ESCALATION ROUTING TEST PASSED ===",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
