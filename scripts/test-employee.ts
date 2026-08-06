import { Employee } from "../lib/employee/employee";

async function main() {
  const employee = new Employee();

  const messages = [
    "Hi, my name is John. I need a roof replacement in Dallas. It's pretty urgent.",
    "My phone number is 817-555-1234.",
    "Tomorrow afternoon works best.",
  ];

  for (const content of messages) {
    const result = await employee.process({
      source: "phone",
      customerId: "customer_001",
      content,
      timestamp: new Date(),
    });

    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);