import { supabaseServer } from "@/app/lib/supabase-server";

import {
  OutreachRepository,
} from "@/lib/repositories/outreach-repository";

import {
  OutreachService,
} from "@/lib/services/outreach-service";

const baseUrl =
  process.env.TEST_BASE_URL ||
  "http://localhost:3000";

const secret =
  process.env.ZENNX_INTERNAL_API_SECRET || "";

const businessId =
  process.env.DEFAULT_BUSINESS_ID || "";

if (!secret) {
  throw new Error(
    "Missing ZENNX_INTERNAL_API_SECRET",
  );
}

if (!businessId) {
  throw new Error(
    "Missing DEFAULT_BUSINESS_ID",
  );
}

const repository =
  new OutreachRepository();

const service =
  new OutreachService(repository);

const headers = {
  authorization: `Bearer ${secret}`,
  "content-type": "application/json",
};

async function readJson(
  response: Response,
) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

async function main() {
  let contactId: string | undefined;
  let messageId: string | undefined;

  try {
    console.log(
      "1. Checking unauthorized access...",
    );

    const unauthorizedResponse =
      await fetch(
        `${baseUrl}/api/outreach/approvals`,
      );

    if (
      unauthorizedResponse.status !== 401
    ) {
      throw new Error(
        `Expected unauthorized request to return 401, got ${unauthorizedResponse.status}`,
      );
    }

    console.log(
      "UNAUTHORIZED REQUEST BLOCKED",
    );

    console.log(
      "2. Creating test outreach contact...",
    );

    const contact =
      await repository.createContact({
        business_id: businessId,
        contact_type: "business",
        display_name:
          "ZennX Approval API Test",
        platform: "email",
        email:
          "approval-api-test@example.com",
        source:
          "automated-api-lifecycle-test",
        tags: [
          "test",
          "approval-api",
        ],
      });

    contactId = contact.id;

    console.log(
      "CONTACT CREATED:",
      contactId,
    );

    console.log(
      "3. Creating pending approval draft...",
    );

    const draft =
      await service.createDraft({
        business_id: businessId,
        contact_id: contactId!,
        channel: "email",
        body:
          "This is an automated ZennX outreach approval lifecycle test.",
        requires_approval: true,
      });

    messageId = draft.id;

    if (
      draft.status !==
      "pending_approval"
    ) {
      throw new Error(
        `Expected pending_approval, got ${draft.status}`,
      );
    }

    console.log(
      "DRAFT CREATED:",
      messageId,
    );

    console.log(
      "4. Checking GET approval queue...",
    );

    const pendingResponse =
      await fetch(
        `${baseUrl}/api/outreach/approvals?businessId=${encodeURIComponent(
          businessId,
        )}`,
        {
          headers,
        },
      );

    const pendingBody =
      await readJson(pendingResponse);

    if (!pendingResponse.ok) {
      throw new Error(
        `GET approvals failed: ${JSON.stringify(
          pendingBody,
        )}`,
      );
    }

    const foundPending =
      Array.isArray(
        pendingBody.approvals,
      ) &&
      pendingBody.approvals.some(
        (
          item: {
            id?: string;
          },
        ) => item.id === messageId,
      );

    if (!foundPending) {
      throw new Error(
        "Created draft was not returned by approval queue.",
      );
    }

    console.log(
      "DRAFT FOUND IN APPROVAL QUEUE",
    );

    console.log(
      "5. Approving through API...",
    );

    const approveResponse =
      await fetch(
        `${baseUrl}/api/outreach/approvals`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            businessId,
            messageId,
            action: "approve",
            approvedBy:
              "automated-api-test",
          }),
        },
      );

    const approveBody =
      await readJson(approveResponse);

    if (!approveResponse.ok) {
      throw new Error(
        `Approval POST failed: ${JSON.stringify(
          approveBody,
        )}`,
      );
    }

    if (
      approveBody.message?.status !==
      "approved"
    ) {
      throw new Error(
        `Expected approved status, got ${approveBody.message?.status}`,
      );
    }

    console.log(
      "DRAFT APPROVED THROUGH API",
    );

    console.log(
      "6. Verifying database state...",
    );

    const stored =
      await repository.findMessage(
        businessId,
        messageId,
      );

    if (
      stored?.status !== "approved"
    ) {
      throw new Error(
        `Database expected approved, got ${stored?.status}`,
      );
    }

    if (!stored.approved_at) {
      throw new Error(
        "approved_at was not recorded.",
      );
    }

    console.log(
      "DATABASE STATE VERIFIED",
    );

    console.log(
      "7. Confirming approved message leaves queue...",
    );

    const afterResponse =
      await fetch(
        `${baseUrl}/api/outreach/approvals?businessId=${encodeURIComponent(
          businessId,
        )}`,
        {
          headers,
        },
      );

    const afterBody =
      await readJson(afterResponse);

    if (!afterResponse.ok) {
      throw new Error(
        `Final GET failed: ${JSON.stringify(
          afterBody,
        )}`,
      );
    }

    const stillPending =
      Array.isArray(
        afterBody.approvals,
      ) &&
      afterBody.approvals.some(
        (
          item: {
            id?: string;
          },
        ) => item.id === messageId,
      );

    if (stillPending) {
      throw new Error(
        "Approved message is still in pending approval queue.",
      );
    }

    console.log(
      "APPROVED MESSAGE REMOVED FROM QUEUE",
    );

    console.log(
      "OUTREACH APPROVAL LIFECYCLE API TEST PASSED",
    );
  } finally {
    if (messageId) {
      await supabaseServer
        .from("outreach_messages")
        .delete()
        .eq("id", messageId);
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
