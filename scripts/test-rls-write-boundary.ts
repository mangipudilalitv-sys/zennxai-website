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

async function main() {
  console.log("\n=== GET REAL SERVER RECORD ===");

  const { data: customer, error: customerError } =
    await server
      .from("customers")
      .select("id,business_id,name")
      .limit(1)
      .single();

  if (customerError || !customer) {
    throw new Error(
      `Could not load test customer: ${customerError?.message}`,
    );
  }

  console.log("Using customer:", customer.id);
  console.log("Business:", customer.business_id);

  let failed = false;

  console.log("\n=== ANON INSERT ATTACK ===");

  const insertResult = await anon
    .from("customers")
    .insert({
      business_id: customer.business_id,
      name: "RLS_ATTACK_SHOULD_NOT_EXIST",
    })
    .select();

  console.log(
    "insert rows:",
    insertResult.data?.length ?? 0,
    "error:",
    insertResult.error?.message ?? "none",
  );

  if ((insertResult.data?.length ?? 0) > 0) {
    console.error("FAIL: anon INSERT succeeded.");
    failed = true;
  }

  console.log("\n=== ANON UPDATE ATTACK ===");

  const updateResult = await anon
    .from("customers")
    .update({
      name: "RLS_ATTACK_UPDATE",
    })
    .eq("id", customer.id)
    .select();

  console.log(
    "update rows:",
    updateResult.data?.length ?? 0,
    "error:",
    updateResult.error?.message ?? "none",
  );

  if ((updateResult.data?.length ?? 0) > 0) {
    console.error("FAIL: anon UPDATE succeeded.");
    failed = true;
  }

  console.log("\n=== ANON DELETE ATTACK ===");

  const deleteResult = await anon
    .from("customers")
    .delete()
    .eq("id", customer.id)
    .select();

  console.log(
    "delete rows:",
    deleteResult.data?.length ?? 0,
    "error:",
    deleteResult.error?.message ?? "none",
  );

  if ((deleteResult.data?.length ?? 0) > 0) {
    console.error("FAIL: anon DELETE succeeded.");
    failed = true;
  }

  console.log("\n=== VERIFY RECORD SURVIVED ===");

  const { data: survived, error: survivedError } =
    await server
      .from("customers")
      .select("id,name")
      .eq("id", customer.id)
      .single();

  console.log(
    "record exists:",
    Boolean(survived),
    "error:",
    survivedError?.message ?? "none",
  );

  if (!survived) {
    console.error(
      "FAIL: original customer disappeared.",
    );
    failed = true;
  }

  console.log("\n=== ANON RPC ATTACK ===");

  for (const rpc of [
    "claim_due_tasks",
    "claim_due_follow_ups",
  ]) {
    const { data, error } = await anon.rpc(
      rpc,
      { p_limit: 1 },
    );

    console.log(
      `${rpc}: rows=${
        Array.isArray(data) ? data.length : 0
      }, error=${error?.message ?? "none"}`,
    );

    if (Array.isArray(data) && data.length > 0) {
      console.error(
        `FAIL: anon executed ${rpc} and received work.`,
      );
      failed = true;
    }
  }

  console.log("\n=== SERVER RPC TEST ===");

  for (const rpc of [
    "claim_due_tasks",
    "claim_due_follow_ups",
  ]) {
    const { data, error } = await server.rpc(
      rpc,
      { p_limit: 1 },
    );

    console.log(
      `${rpc}: rows=${
        Array.isArray(data) ? data.length : 0
      }, error=${error?.message ?? "none"}`,
    );

    if (error) {
      console.error(
        `FAIL: trusted server RPC ${rpc} failed.`,
      );
      failed = true;
    }
  }

  console.log("\n=== RESULT ===");

  if (failed) {
    console.error("RLS WRITE BOUNDARY FAILED.");
    process.exit(1);
  }

  console.log("PASS: anon INSERT blocked.");
  console.log("PASS: anon UPDATE blocked.");
  console.log("PASS: anon DELETE blocked.");
  console.log("PASS: protected record survived.");
  console.log("PASS: anon worker data unavailable.");
  console.log("PASS: trusted worker RPC access works.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
