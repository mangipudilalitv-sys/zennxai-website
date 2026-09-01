import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Missing Supabase environment variables");
}

const anon = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const server = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const tables = [
  "businesses",
  "business_configurations",
  "customers",
  "leads",
  "appointments",
  "tasks",
  "follow_ups",
  "conversations",
  "goals",
  "learning_events",
  "workflows",
];

async function main() {
  console.log("\n=== ANON ATTACK ===");

  let leaked = false;

  for (const table of tables) {
    const { data, error } = await anon
      .from(table)
      .select("*")
      .limit(3);

    const rows = data?.length ?? 0;

    console.log(
      `${table}: rows=${rows}, error=${error?.message ?? "none"}`,
    );

    if (rows > 0) {
      leaked = true;
    }
  }

  console.log("\n=== TRUSTED SERVER ===");

  let serverWorks = false;

  for (const table of tables) {
    const { data, error } = await server
      .from(table)
      .select("*")
      .limit(1);

    console.log(
      `${table}: rows=${data?.length ?? 0}, error=${error?.message ?? "none"}`,
    );

    if (!error) {
      serverWorks = true;
    }
  }

  console.log("\n=== RESULT ===");

  if (leaked) {
    console.error(
      "FAIL: anon client was able to read tenant data.",
    );
    process.exit(1);
  }

  if (!serverWorks) {
    console.error(
      "FAIL: trusted service-role access is not working.",
    );
    process.exit(1);
  }

  console.log("PASS: anon tenant reads blocked.");
  console.log("PASS: trusted server access works.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
