import { BusinessConfigurationService } from "../lib/services/business-configuration-service";

async function main() {
  const service = new BusinessConfigurationService();

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
    const config = await service.get(business.businessId);

    const bookingPermission = await service.canExecute(
      business.businessId,
      "BOOK_APPOINTMENT",
    );

    console.log("\n==============================");
    console.log(business.name);
    console.log("==============================");
    console.log("Business ID:", business.businessId);
    console.log(
      "Approval rules:",
      config?.approval_required_actions,
    );
    console.log(
      "BOOK_APPOINTMENT permission:",
      bookingPermission,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
