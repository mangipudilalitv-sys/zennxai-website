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

async function main() {
  const response = await fetch(
    `${baseUrl}/api/outreach/approvals?businessId=${encodeURIComponent(
      businessId,
    )}`,
    {
      headers: {
        authorization: `Bearer ${secret}`,
      },
    },
  );

  const body = await response.json();

  console.log(
    "STATUS:",
    response.status,
  );

  console.log(
    JSON.stringify(body, null, 2),
  );

  if (!response.ok) {
    throw new Error(
      `Approval API failed with ${response.status}`,
    );
  }

  if (body.success !== true) {
    throw new Error(
      "Approval API did not return success=true",
    );
  }

  if (!Array.isArray(body.approvals)) {
    throw new Error(
      "Approval API approvals is not an array",
    );
  }

  console.log(
    "OUTREACH APPROVAL API TEST PASSED",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
