import assert from "node:assert/strict";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  EmployeeActions,
} from "../lib/employee/employee-actions";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const businessId =
  process.env.DEFAULT_BUSINESS_ID;
const customerId =
  process.env.TEST_CUSTOMER_ID ??
  "21810206-8687-448c-bb76-0716a3277f1a";

if (
  !supabaseUrl ||
  !serviceRoleKey ||
  !businessId
) {
  throw new Error(
    "Missing required Supabase or business environment variables.",
  );
}

const supabase =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

const originalStart =
  "2037-06-01T17:00:00.000Z";
const originalEnd =
  "2037-06-01T18:00:00.000Z";
const expectedStart =
  "2037-06-02T17:00:00.000Z";
const expectedEnd =
  "2037-06-02T18:00:00.000Z";

let appointmentId:
  | string
  | undefined;

(async () => {
  try {
    const {
      data: appointment,
      error: createError,
    } = await supabase
      .from("appointments")
      .insert({
        business_id:
          businessId,
        customer_id:
          customerId,
        start_time:
          originalStart,
        end_time:
          originalEnd,
        status:
          "scheduled",
        notes:
          "Live rescheduling test",
      })
      .select("*")
      .single();

    if (createError) {
      throw createError;
    }

    appointmentId =
      appointment.id;

    const actions =
      new EmployeeActions();

    const result =
      await actions.execute(
        "RESCHEDULE_APPOINTMENT",
        {
          businessId,
          customerId,
          source:
            "sms",
          content:
            "Please reschedule my appointment to June 2, 2037 at 10 AM",
          bookingTimezone:
            "America/Los_Angeles",
          appointmentDurationMinutes:
            60,
          businessHours: {
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
            saturday:
              null,
            sunday:
              null,
          },
        },
      );

    console.log(
      "Rescheduling result:",
      result,
    );

    assert.equal(
      result.success,
      true,
    );
    assert.equal(
      result.action,
      "RESCHEDULE_APPOINTMENT",
    );

    const {
      data: persisted,
      error: readError,
    } = await supabase
      .from("appointments")
      .select("*")
      .eq(
        "id",
        appointmentId,
      )
      .single();

    if (readError) {
      throw readError;
    }

    assert.equal(
      persisted.status,
      "scheduled",
    );
    assert.equal(
      new Date(
        persisted.start_time,
      ).toISOString(),
      expectedStart,
    );
    assert.equal(
      new Date(
        persisted.end_time,
      ).toISOString(),
      expectedEnd,
    );

    console.log(
      "LIVE APPOINTMENT RESCHEDULING TEST PASSED",
    );
  } finally {
    if (appointmentId) {
      const {
        error: cleanupError,
      } = await supabase
        .from("appointments")
        .delete()
        .eq(
          "id",
          appointmentId,
        );

      if (cleanupError) {
        console.error(
          "Rescheduling test cleanup failed:",
          cleanupError,
        );
      } else {
        console.log(
          "Rescheduling test appointment cleaned up.",
        );
      }
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
