import { supabaseServer } from "@/app/lib/supabase-server";

import {
  OutreachRepository,
} from "@/lib/repositories/outreach-repository";

import {
  OutreachService,
} from "@/lib/services/outreach-service";

const businessId =
  process.env.DEFAULT_BUSINESS_ID || "";

if (!businessId) {
  throw new Error(
    "Missing DEFAULT_BUSINESS_ID",
  );
}

const repository =
  new OutreachRepository();

const service =
  new OutreachService(repository);

async function main() {
  let contactId = "";
  let rejectedId = "";
  let approvedId = "";

  try {
    const contact =
      await repository.createContact({
        business_id: businessId,
        contact_type: "business",
        display_name:
          "ZennX Reject Send Test",
        platform: "email",
        email:
          "reject-send-test@example.com",
        source:
          "automated-reject-send-test",
        tags: [
          "test",
          "outreach",
        ],
      });

    contactId = contact.id;

    console.log(
      "CONTACT CREATED",
    );

    const rejectDraft =
      await service.createDraft({
        business_id: businessId,
        contact_id: contactId!,
        channel: "email",
        body:
          "This message should be rejected.",
        requires_approval: true,
      });

    rejectedId = rejectDraft.id;

    const rejected =
      await service.rejectDraft(
        businessId,
        rejectedId,
      );

    if (
      rejected.status !== "rejected"
    ) {
      throw new Error(
        `Expected rejected, got ${rejected.status}`,
      );
    }

    console.log(
      "REJECT FLOW PASSED",
    );

    let rejectedSendBlocked = false;

    try {
      await service.markSent(
        businessId,
        rejectedId,
      );
    } catch {
      rejectedSendBlocked = true;
    }

    if (!rejectedSendBlocked) {
      throw new Error(
        "Rejected message was allowed to send.",
      );
    }

    console.log(
      "REJECTED MESSAGE SEND BLOCKED",
    );

    const sendDraft =
      await service.createDraft({
        business_id: businessId,
        contact_id: contactId!,
        channel: "email",
        body:
          "This message should be approved and marked sent.",
        requires_approval: true,
      });

    approvedId = sendDraft.id;

    let preApprovalBlocked = false;

    try {
      await service.markSent(
        businessId,
        approvedId,
      );
    } catch {
      preApprovalBlocked = true;
    }

    if (!preApprovalBlocked) {
      throw new Error(
        "Pending approval message was allowed to send.",
      );
    }

    console.log(
      "PRE-APPROVAL SEND BLOCKED",
    );

    await service.approveDraft(
      businessId,
      approvedId,
      "automated-send-test",
    );

    const sent =
      await service.markSent(
        businessId,
        approvedId,
        "test-external-message-id",
      );

    if (sent.status !== "sent") {
      throw new Error(
        `Expected sent, got ${sent.status}`,
      );
    }

    if (!sent.sent_at) {
      throw new Error(
        "sent_at was not recorded.",
      );
    }

    if (
      sent.external_message_id !==
      "test-external-message-id"
    ) {
      throw new Error(
        "external_message_id was not recorded.",
      );
    }

    console.log(
      "APPROVE THEN SEND FLOW PASSED",
    );

    console.log(
      "OUTREACH REJECT AND SEND TEST PASSED",
    );
  } finally {
    const ids = [
      rejectedId,
      approvedId,
    ].filter(Boolean);

    if (ids.length) {
      await supabaseServer
        .from("outreach_messages")
        .delete()
        .in(
          "id",
          ids as string[],
        );
    }

    if (contactId) {
      await supabaseServer
        .from("outreach_contacts")
        .delete()
        .eq("id", contactId);
    }

    console.log(
      "Test outreach data cleaned up.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
