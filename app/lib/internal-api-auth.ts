import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function isAuthorizedInternalRequest(
  request: Request,
) {
  const secret = (
    process.env.ZENNX_INTERNAL_API_SECRET || ""
  ).trim();

  if (!secret) {
    console.error(
      "ZENNX_INTERNAL_API_SECRET is not configured",
    );
    return false;
  }

  const authorization =
    request.headers.get("authorization") || "";

  return safeEqual(
    authorization,
    `Bearer ${secret}`,
  );
}