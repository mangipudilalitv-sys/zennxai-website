type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (
    !existing ||
    existing.resetAt <= now
  ) {
    const resetAt =
      now + windowMs;

    buckets.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining:
        Math.max(limit - 1, 0),
      resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt:
        existing.resetAt,
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    remaining:
      Math.max(
        limit - existing.count,
        0,
      ),
    resetAt:
      existing.resetAt,
  };
}
