import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  EmployeeActions,
} from "../lib/employee/employee-actions";
import type {
  BusinessHours,
} from "../lib/employee/appointment-availability";

const businessHours: BusinessHours = {
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

async function main() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const businessId =
    process.env.DEFAULT_BUSINESS_ID;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !businessId
  ) {
    throw new Error(
      "Supabase and business environment variables are required.",
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

  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .limit(1)
    .maybeSingle();

  if (customerError) {
    throw customerError;
  }

  if (!customer) {
    throw new Error(
      "A customer is required for the live booking test.",
    );
  }

  const actions =
    new EmployeeActions();

  let appointmentId:
    | string
    | undefined;

  const baseInput = {
    businessId,
    customerId:
      customer.id,
    source:
      "booking_test",
    content:
      "Book the test appointment.",
    bookingTimezone:
      "America/Los_Angeles",
    appointmentDurationMinutes:
      60,
    businessHours,
  };

  try {
    const validResult =
      await actions.execute(
        "BOOK_APPOINTMENT",
        {
          ...baseInput,
          qualification: {
            name:
              "ZennX Booking Test",
            serviceType:
              "demo",
            location:
              "San Ramon",
            urgency:
              "normal",
            preferredTime:
              "2035-06-01T10:00:00-07:00",
          },
        },
      );

    console.log(
      "Valid booking result:",
      validResult,
    );

    assert.equal(
      validResult.success,
      true,
    );

    const appointment =
      validResult.data as {
        id: string;
        business_id: string;
        customer_id: string;
        start_time: string;
        end_time: string;
        status: string;
      };

    appointmentId =
      appointment.id;

    assert.equal(
      appointment.business_id,
      businessId,
    );

    assert.equal(
      appointment.customer_id,
      customer.id,
    );

    assert.equal(
      appointment.status,
      "scheduled",
    );

    assert.equal(
      new Date(
        appointment.end_time,
      ).getTime() -
        new Date(
          appointment.start_time,
        ).getTime(),
      60 * 60 * 1000,
    );

    const conflictResult =
      await actions.execute(
        "BOOK_APPOINTMENT",
        {
          ...baseInput,
          qualification: {
            name:
              "ZennX Conflict Test",
            serviceType:
              "demo",
            location:
              "San Ramon",
            urgency:
              "normal",
            preferredTime:
              "2035-06-01T10:30:00-07:00",
          },
        },
      );

    console.log(
      "Conflict result:",
      conflictResult,
    );

    assert.equal(
      conflictResult.success,
      false,
    );

    assert.equal(
      (
        conflictResult.data as {
          reason?: string;
        }
      ).reason,
      "APPOINTMENT_CONFLICT",
    );

    const {
      error: databaseConflictError,
    } = await supabase
      .from("appointments")
      .insert({
        business_id:
          businessId,
        customer_id:
          customer.id,
        start_time:
          "2035-06-01T17:30:00.000Z",
        end_time:
          "2035-06-01T18:30:00.000Z",
        status:
          "scheduled",
        notes:
          "Database overlap constraint test",
      });

    console.log(
      "Database conflict code:",
      databaseConflictError?.code,
    );

    assert.equal(
      databaseConflictError?.code,
      "23P01",
    );

    const weekendResult =
      await actions.execute(
        "BOOK_APPOINTMENT",
        {
          ...baseInput,
          qualification: {
            name:
              "ZennX Weekend Test",
            serviceType:
              "demo",
            location:
              "San Ramon",
            urgency:
              "normal",
            preferredTime:
              "2035-06-02T10:00:00-07:00",
          },
        },
      );

    console.log(
      "Weekend result:",
      weekendResult,
    );

    assert.equal(
      weekendResult.success,
      false,
    );

    assert.equal(
      (
        weekendResult.data as {
          reason?: string;
        }
      ).reason,
      "CLOSED",
    );

    console.log(
      "LIVE APPOINTMENT AVAILABILITY TEST PASSED",
    );
  } finally {
    if (appointmentId) {
      const { error } =
        await supabase
          .from("appointments")
          .delete()
          .eq("id", appointmentId)
          .eq(
            "business_id",
            businessId,
          );

      if (error) throw error;

      console.log(
        "Test appointment cleaned up.",
      );
    }
  }
}

main().catch((error) => {
  console.error(
    "LIVE APPOINTMENT AVAILABILITY TEST FAILED:",
    error,
  );

  process.exit(1);
});
