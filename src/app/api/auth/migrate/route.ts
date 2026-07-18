import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";
import { GUEST_COOKIE } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Migrates guest-owned data to the signed-in user, then clears the guest
 * cookie. Called once client-side right after authentication.
 */
export async function POST() {
  if (!isMongoConfigured()) {
    return NextResponse.json({ migrated: false });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ migrated: false });
  }

  const store = await cookies();
  const guestId = store.get(GUEST_COOKIE)?.value;
  if (!guestId || guestId === session.user.id) {
    return NextResponse.json({ migrated: false });
  }

  try {
    const { searchQueries } = await collections();
    await searchQueries.updateMany(
      { ownerId: guestId },
      { $set: { ownerId: session.user.id } }
    );
  } catch (error) {
    console.error("[migrate] failed:", error);
    return NextResponse.json({ migrated: false }, { status: 500 });
  }

  const response = NextResponse.json({ migrated: true });
  response.cookies.delete(GUEST_COOKIE);
  return response;
}
