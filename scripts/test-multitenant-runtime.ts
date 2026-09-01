import { EmployeeRuntime } from "../lib/employee/employee-runtime";

async function main() {
  const runtime = new EmployeeRuntime();

  const businesses = [
    {
      name: "Business A",
      businessId: "c607e1ab-1d31-4ff4-b4d3-2928b8b19830",
    },
    {
      name: "Business B",
      businessId: "2929a5c0-4e8b-4f54-b3c0-fb32cc616fe2",
    },
  ];

  for (const business of businesses) {
    const result = await runtime.process({
      customerId: `test-${business.name}`,
      businessId: business.businessId,
      source: "test",
      content: "I am ready to book an appointment.",
    } as any);

    console.log("\n==============================");
    console.log(business.name);
    console.log("==============================");
    console.log("Business ID:", business.businessId);
    console.log("Decision:", result.decision);
    console.log("Result:", result.result);
    console.log(
      "Approval required:",
      result.businessConfiguration?.approval_required_actions,
    );
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
