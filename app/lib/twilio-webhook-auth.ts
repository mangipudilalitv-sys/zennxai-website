import twilio from "twilio";

function getRequestUrl(req: Request) {
  const forwardedProto =
    req.headers.get("x-forwarded-proto");

  const forwardedHost =
    req.headers.get("x-forwarded-host");

  if (forwardedHost) {
    const proto = forwardedProto || "https";

    const original = new URL(req.url);

    return `${proto}://${forwardedHost}${original.pathname}${original.search}`;
  }

  return req.url;
}

export async function isValidTwilioFormRequest(
  req: Request,
  formData: FormData,
) {
  const authToken =
    process.env.TWILIO_AUTH_TOKEN;

  const signature =
    req.headers.get("x-twilio-signature");

  if (!authToken || !signature) {
    return false;
  }

  const params: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }

  return twilio.validateRequest(
    authToken,
    signature,
    getRequestUrl(req),
    params,
  );
}

export function isValidTwilioGetRequest(
  req: Request,
) {
  const authToken =
    process.env.TWILIO_AUTH_TOKEN;

  const signature =
    req.headers.get("x-twilio-signature");

  if (!authToken || !signature) {
    return false;
  }

  return twilio.validateRequest(
    authToken,
    signature,
    getRequestUrl(req),
    {},
  );
}
