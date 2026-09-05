import assert from "node:assert/strict";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  EmployeeActions,
} from "../lib/employee/employee-actions";

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
      "A customer is required for the cancellation test.",
    );
  }

  const {
    data: appointment,
    error: createError,
  } = await supabase
    .from("appointments")
    .insert({
      business_id:
        businessId,
      customer_id:
        customer.id,
      start_time:
        "2036-06-02T17:00:00.000Z",
      end_time:
        "2036-06-02T18:00:00.000Z",
      status:
        "scheduled",
      notes:
        "Live cancellation test",
    })
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  try {
    const actions =
      new EmployeeActions();

    const result =
      await actions.execute(
        "CANCEL_APPOINTMENT",
        {
          businessId,
          customerId:
            customer.id,
          source:
            "cancellation_test",
          content:
            "Cancel my appointment",
        },
      );

    console.log(
      "Cancellation result:",
      result,
    );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      (
        result.data as {
          id: string;
        }
      ).id,
      appointment.id,
    );

    assert.equal(
      (
        result.data as {
          status: string;
        }
      ).status,
      "cancelled",
    );

    const {
      data: persisted,
      error: readError,
    } = await supabase
      .from("appointments")
      .select("id,status")
      .eq("id", appointment.id)
      .eq(
        "business_id",
        businessId,
      )
      .single();

    if (readError) {
      throw readError;
    }

    assert.equal(
      persisted.status,
      "cancelled",
    );

    console.log(
      "LIVE APPOINTMENT CANCELLATION TEST PASSED",
    );
  } finally {
    const { error } =
      await supabase
        .from("appointments")
        .delete()
        .eq("id", appointment.id)
        .eq(
          "business_id",
          businessId,
        );

    if (error) {
      throw error;
    }

    console.log(
      "Cancellation test appointment cleaned up.",
    );
  }
}

main().catch((error) => {
  console.error(
    "LIVE APPOINTMENT CANCELLATION TEST FAILED:",
    error,
  );

  process.exit(1);
});
