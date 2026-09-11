import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate":
        'Basic realm="ZennX Dashboard", charset="UTF-8"',
    },
  });
}

function safeEqual(
  left: string,
  right: string,
) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |=
      left.charCodeAt(index) ^
      right.charCodeAt(index);
  }

  return result === 0;
}

export function proxy(
  request: NextRequest,
) {
  const expectedUsername =
    String(
      process.env
        .ZENNX_DASHBOARD_USERNAME || "",
    ).trim();

  const expectedPassword =
    String(
      process.env
        .ZENNX_DASHBOARD_PASSWORD || "",
    );

  if (
    !expectedUsername ||
    !expectedPassword
  ) {
    console.error(
      "Dashboard credentials are not configured.",
    );

    return new NextResponse(
      "Dashboard authentication is not configured",
      {
        status: 503,
      },
    );
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Basic ",
    )
  ) {
    return unauthorized();
  }

  try {
    const encoded =
      authorization.slice(
        "Basic ".length,
      );

    const decoded =
      atob(encoded);

    const separator =
      decoded.indexOf(":");

    if (separator === -1) {
      return unauthorized();
    }

    const username =
      decoded.slice(
        0,
        separator,
      );

    const password =
      decoded.slice(
        separator + 1,
      );

    if (
      !safeEqual(
        username,
        expectedUsername,
      ) ||
      !safeEqual(
        password,
        expectedPassword,
      )
    ) {
      return unauthorized();
    }

    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
  ],
};
