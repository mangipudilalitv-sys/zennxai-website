import {
  type BusinessHours,
  checkBusinessHours,
} from "../lib/employee/appointment-availability";

const hours: BusinessHours = {
  monday: {
    open: "09:00",
    close: "17:00",
  },
  tuesday: {
    open: "09:00",
    close: "17:00",
  },
  wednesday: {
    open: "09:00",
    close: "17:00",
  },
  thursday: {
    open: "09:00",
    close: "17:00",
  },
  friday: {
    open: "09:00",
    close: "17:00",
  },
  saturday: null,
  sunday: null,
};

function expect(
  condition: boolean,
  message: string,
) {
  if (!condition) {
    throw new Error(message);
  }
}

const timezone =
  "America/Los_Angeles";

const duringHours =
  checkBusinessHours(
    "2035-06-01T17:00:00Z",
    "2035-06-01T18:00:00Z",
    timezone,
    hours,
  );

expect(
  duringHours.available,
  "Expected Friday at 10 AM to be available",
);

const beforeOpening =
  checkBusinessHours(
    "2035-06-01T15:00:00Z",
    "2035-06-01T16:00:00Z",
    timezone,
    hours,
  );

expect(
  beforeOpening.reason ===
    "OUTSIDE_HOURS",
  "Expected Friday at 8 AM to be rejected",
);

const afterClosing =
  checkBusinessHours(
    "2035-06-02T00:30:00Z",
    "2035-06-02T01:30:00Z",
    timezone,
    hours,
  );

expect(
  afterClosing.reason ===
    "OUTSIDE_HOURS",
  "Expected appointment ending after 5 PM to be rejected",
);

const weekend =
  checkBusinessHours(
    "2035-06-02T17:00:00Z",
    "2035-06-02T18:00:00Z",
    timezone,
    hours,
  );

expect(
  weekend.reason === "CLOSED",
  "Expected Saturday to be rejected",
);

console.log(
  "APPOINTMENT AVAILABILITY TEST PASSED",
);
