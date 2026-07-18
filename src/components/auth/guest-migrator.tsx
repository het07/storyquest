"use client";

import * as React from "react";
import { useSession } from "next-auth/react";

const FLAG = "sqa:migrated";

/** Fires the guest→user data migration once, right after sign-in. */
export function GuestMigrator() {
  const { status } = useSession();

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (sessionStorage.getItem(FLAG) === "1") return;

    fetch("/api/auth/migrate", { method: "POST" })
      .then(() => sessionStorage.setItem(FLAG, "1"))
      .catch(() => {
        /* best-effort */
      });
  }, [status]);

  return null;
}
