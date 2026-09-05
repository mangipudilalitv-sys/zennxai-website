import assert from "node:assert/strict";
import {
  canMarkOutreachMessageSent,
} from "../lib/services/outreach-service";

assert.equal(
  canMarkOutreachMessageSent(
    "pending_approval",
    true,
  ),
  false,
);

assert.equal(
  canMarkOutreachMessageSent(
    "rejected",
    true,
  ),
  false,
);

assert.equal(
  canMarkOutreachMessageSent(
    "approved",
    true,
  ),
  true,
);

assert.equal(
  canMarkOutreachMessageSent(
    "scheduled",
    true,
  ),
  true,
);

console.log(
  "OUTREACH APPROVAL POLICY TEST PASSED",
);
