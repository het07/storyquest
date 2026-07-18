import { NextResponse, type NextRequest } from "next/server";

import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE } from "@/lib/constants";

/**
 * Ensures every visitor has an anonymous guest id cookie so they can use the
 * app with no login wall. Signed-in users keep the cookie too (harmless); it is
 * cleared after their guest data is migrated on sign-in.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(GUEST_COOKIE)) {
    response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
