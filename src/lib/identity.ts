import { cookies } from "next/headers";

import { auth } from "@/auth";
import { GUEST_COOKIE } from "@/lib/constants";

export interface Identity {
  /** The stable owner id (permanent user id or guest cookie id), or null. */
  ownerId: string | null;
  isGuest: boolean;
}

/**
 * Resolves the current identity for server code. Prefers a signed-in Auth.js
 * user; otherwise falls back to the anonymous guest cookie (set by the proxy).
 */
export async function resolveIdentity(): Promise<Identity> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return { ownerId: session.user.id, isGuest: false };
    }
  } catch {
    // Auth not configured or unavailable — treat as guest.
  }

  const store = await cookies();
  const guestId = store.get(GUEST_COOKIE)?.value ?? null;
  return { ownerId: guestId, isGuest: true };
}
