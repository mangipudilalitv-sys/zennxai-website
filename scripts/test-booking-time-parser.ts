import assert from "node:assert/strict";
import { parseBookingTime } from "../lib/employee/booking-time-parser";

const referenceDate =
  new Date("2026-09-04T19:00:00.000Z");

const timezone =
  "America/Los_Angeles";

const tomorrow =
  parseBookingTime({
    preferredTime:
      "tomorrow at 2pm",
    timezone,
    durationMinutes: 60,
    referenceDate,
  });

assert.equal(
  tomorrow?.startTime,
  "2026-09-05T21:00:00.000Z",
);

assert.equal(
  tomorrow?.endTime,
  "2026-09-05T22:00:00.000Z",
);

const morning =
  parseBookingTime({
    preferredTime:
      "tomorrow morning",
    timezone,
    durationMinutes: 30,
    referenceDate,
  });

assert.equal(
  morning?.startTime,
  "2026-09-05T16:00:00.000Z",
);

assert.equal(
  morning?.endTime,
  "2026-09-05T16:30:00.000Z",
);

const nextFriday =
  parseBookingTime({
    preferredTime:
      "next Friday at 10:30am",
    timezone,
    referenceDate,
  });

assert.equal(
  nextFriday?.startTime,
  "2026-09-11T17:30:00.000Z",
);

const dateWithoutTime =
  parseBookingTime({
    preferredTime:
      "next Friday",
    timezone,
    referenceDate,
  });

assert.equal(
  dateWithoutTime,
  undefined,
);

const pastIso =
  parseBookingTime({
    preferredTime:
      "2026-09-01T10:00:00-07:00",
    timezone,
    referenceDate,
  });

assert.equal(
  pastIso,
  undefined,
);

const invalidTimezone =
  parseBookingTime({
    preferredTime:
      "tomorrow at 2pm",
    timezone:
      "Not/A_Timezone",
    referenceDate,
  });

assert.equal(
  invalidTimezone,
  undefined,
);

console.log(
  "BOOKING TIME PARSER TEST PASSED",
);
