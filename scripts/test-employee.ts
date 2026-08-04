import { Employee } from "../lib/employee/employee";

async function main() {
  const employee = new Employee();

  const result = await employee.process({
    source: "phone",
    customerId: "customer_001",
    content: "Hi, I'd like an estimate for a roof replacement.",
    timestamp: new Date(),
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);