import assert from "node:assert/strict";
import {
  detectAppointmentLifecycleIntent,
} from "../lib/employee/appointment-intent";

const cases: Array<{
  message: string;
  expected:
    | "CANCEL_APPOINTMENT"
    | "RESCHEDULE_APPOINTMENT"
    | undefined;
}> = [
  {
    message:
      "I need to cancel my appointment",
    expected:
      "CANCEL_APPOINTMENT",
  },
  {
    message:
      "Cancel my booking please",
    expected:
      "CANCEL_APPOINTMENT",
  },
  {
    message:
      "Can I reschedule my appointment?",
    expected:
      "RESCHEDULE_APPOINTMENT",
  },
  {
    message:
      "Move my booking to Friday",
    expected:
      "RESCHEDULE_APPOINTMENT",
  },
  {
    message:
      "I need to cancel my estimate request",
    expected:
      undefined,
  },
  {
    message:
      "What time is my appointment?",
    expected:
      undefined,
  },
];

for (const testCase of cases) {
  assert.equal(
    detectAppointmentLifecycleIntent(
      testCase.message,
    ),
    testCase.expected,
    testCase.message,
  );
}

console.log(
  "APPOINTMENT INTENT TEST PASSED",
);
