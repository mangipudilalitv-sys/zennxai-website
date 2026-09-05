import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { EmployeeActions } from "../lib/employee/employee-actions";

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

  const { data: customer, error: customerError } =
    await supabase
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

  try {
    const result =
      await actions.execute(
        "BOOK_APPOINTMENT",
        {
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
      "Booking action result:",
      result,
    );

    assert.equal(
      result.success,
      true,
    );

    const appointment =
      result.data as {
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

    console.log(
      "LIVE APPOINTMENT BOOKING TEST PASSED",
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
    "LIVE APPOINTMENT BOOKING TEST FAILED:",
    error,
  );

  process.exit(1);
});
