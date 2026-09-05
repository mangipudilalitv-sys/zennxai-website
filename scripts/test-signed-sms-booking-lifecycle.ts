import assert from "node:assert/strict";
import twilio from "twilio";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  POST,
} from "../app/api/sms/inbound/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const businessId =
  process.env.DEFAULT_BUSINESS_ID;
const authToken =
  process.env.TWILIO_AUTH_TOKEN;
const rawCustomerPhone =
  process.env.TEST_CUSTOMER_PHONE;
const rawTwilioPhone =
  process.env.TWILIO_PHONE_NUMBER;

if (
  !supabaseUrl ||
  !serviceRoleKey ||
  !businessId ||
  !authToken ||
  !rawCustomerPhone ||
  !rawTwilioPhone
) {
  throw new Error(
    "Missing Supabase, business, Twilio, or test-phone environment variables.",
  );
}

function normalizeE164(
  value: string,
) {
  const digits =
    value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  throw new Error(
    "Test phone number must be a valid US phone number.",
  );
}

function normalizeCustomerPhone(
  value: string,
) {
  const digits =
    value.replace(/\D/g, "");

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return digits.slice(1);
  }

  if (digits.length === 10) {
    return digits;
  }

  throw new Error(
    "Test customer phone must contain 10 US digits.",
  );
}

const customerPhone =
  normalizeE164(
    rawCustomerPhone,
  );

const storedCustomerPhone =
  normalizeCustomerPhone(
    rawCustomerPhone,
  );

const twilioPhone =
  normalizeE164(
    rawTwilioPhone,
  );

const webhookUrl =
  "https://www.zennxai.com/api/sms/inbound";

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

function createSignedRequest(
  body: string,
) {
  const params = {
    From:
      customerPhone,
    To:
      twilioPhone,
    Body:
      body,
  };

  const signature =
    twilio.getExpectedTwilioSignature(
      authToken!,
      webhookUrl,
      params,
    );

  return new Request(
    webhookUrl,
    {
      method:
        "POST",
      headers: {
        "content-type":
          "application/x-www-form-urlencoded",
        "x-twilio-signature":
          signature,
      },
      body:
        new URLSearchParams(
          params,
        ).toString(),
    },
  );
}

let appointmentId:
  | string
  | undefined;

(async () => {
  try {
    const {
      data: customer,
      error: customerError,
    } = await supabase
      .from("customers")
      .select("id,business_id,phone")
      .eq(
        "business_id",
        businessId,
      )
      .eq(
        "phone",
        storedCustomerPhone,
      )
      .maybeSingle();

    if (customerError) {
      throw customerError;
    }

    if (!customer) {
      throw new Error(
        "TEST_CUSTOMER_PHONE does not match an existing customer record.",
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
          "2038-06-01T17:00:00.000Z",
        end_time:
          "2038-06-01T18:00:00.000Z",
        status:
          "scheduled",
        notes:
          "Signed inbound SMS lifecycle test",
      })
      .select("*")
      .single();

    if (createError) {
      throw createError;
    }

    appointmentId =
      appointment.id;

    const rescheduleResponse =
      await POST(
        createSignedRequest(
          "Please reschedule my appointment to June 2, 2038 at 10 AM",
        ),
      );

    const rescheduleXml =
      await rescheduleResponse.text();

    console.log(
      "Reschedule TwiML:",
      rescheduleXml,
    );

    assert.equal(
      rescheduleResponse.status,
      200,
    );
    assert.match(
      rescheduleXml,
      /rescheduled successfully/i,
    );

    const {
      data: rescheduled,
      error: rescheduleReadError,
    } = await supabase
      .from("appointments")
      .select("*")
      .eq(
        "id",
        appointmentId,
      )
      .single();

    if (rescheduleReadError) {
      throw rescheduleReadError;
    }

    assert.equal(
      new Date(
        rescheduled.start_time,
      ).toISOString(),
      "2038-06-02T17:00:00.000Z",
    );
    assert.equal(
      rescheduled.status,
      "scheduled",
    );

    const cancelResponse =
      await POST(
        createSignedRequest(
          "Please cancel my appointment",
        ),
      );

    const cancelXml =
      await cancelResponse.text();

    console.log(
      "Cancellation TwiML:",
      cancelXml,
    );

    assert.equal(
      cancelResponse.status,
      200,
    );
    assert.match(
      cancelXml,
      /has been cancelled/i,
    );

    const {
      data: cancelled,
      error: cancelReadError,
    } = await supabase
      .from("appointments")
      .select("*")
      .eq(
        "id",
        appointmentId,
      )
      .single();

    if (cancelReadError) {
      throw cancelReadError;
    }

    assert.equal(
      cancelled.status,
      "cancelled",
    );

    console.log(
      "SIGNED INBOUND SMS BOOKING LIFECYCLE TEST PASSED",
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
          "Signed SMS test cleanup failed:",
          cleanupError,
        );
      } else {
        console.log(
          "Signed SMS test appointment cleaned up.",
        );
      }
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
