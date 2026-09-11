import { supabaseServer } from "@/app/lib/supabase-server";

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const windowSeconds =
    Math.max(
      1,
      Math.ceil(windowMs / 1000),
    );

  const { data, error } =
    await supabaseServer.rpc(
      "check_api_rate_limit",
      {
        p_key: key,
        p_limit: limit,
        p_window_seconds:
          windowSeconds,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    (
      Array.isArray(data)
        ? data[0]
        : data
    ) as RateLimitRow | undefined;

  if (!row) {
    throw new Error(
      "Rate limit RPC returned no result.",
    );
  }

  return {
    allowed:
      Boolean(row.allowed),
    remaining:
      Number(row.remaining || 0),
    retryAfterSeconds:
      Math.max(
        Number(
          row.retry_after_seconds || 0,
        ),
        0,
      ),
  };
}
