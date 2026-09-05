import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  OutreachRepository,
} from "../lib/repositories/outreach-repository";
import {
  OutreachService,
} from "../lib/services/outreach-service";

const businessId =
  process.env.DEFAULT_BUSINESS_ID;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

async function main() {
  if (!businessId) {
    throw new Error(
      "Missing DEFAULT_BUSINESS_ID",
    );
  }

  const marker = randomUUID();
  const repository = new OutreachRepository();
  const service = new OutreachService(repository);

  let contactId: string | undefined;
  let messageId: string | undefined;

  try {
    const contact =
      await repository.createContact({
        business_id: businessId,
        contact_type: "creator",
        display_name: "ZennX Outreach Test",
        platform: "instagram",
        handle: `zennx_test_${marker}`,
        source: "automated_test",
      });

    contactId = contact.id;

    const draft = await service.createDraft({
      business_id: businessId,
      contact_id: contact.id,
      channel: "instagram",
      body:
        "Hi — this is a temporary ZennX outreach approval test.",
    });

    messageId = draft.id;

    assert.equal(
      draft.status,
      "pending_approval",
    );

    await assert.rejects(
      () =>
        service.markSent(
          businessId,
          draft.id,
        ),
      /approved before sending/i,
    );

    const approved =
      await service.approveDraft(
        businessId,
        draft.id,
        "ZennX test",
      );

    assert.equal(
      approved.status,
      "approved",
    );

    const sent = await service.markSent(
      businessId,
      draft.id,
      `test-${marker}`,
    );

    assert.equal(sent.status, "sent");

    console.log(
      "LIVE OUTREACH APPROVAL TEST PASSED",
    );
  } finally {
    if (messageId) {
      await supabase
        .from("outreach_messages")
        .delete()
        .eq("id", messageId);
    }

    if (contactId) {
      await supabase
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
