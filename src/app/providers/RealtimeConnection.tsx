"use client";

import { useEffect } from "react";
import { hasOwnPassword, useSession } from "@/entities/session";
import { realtime } from "@/shared/api";

/**
 * Keeps the live connection open for as long as someone is signed in, and
 * closes it when they sign out. A temporary password opens nothing, here too.
 */
export function RealtimeConnection() {
  const { user } = useSession();
  const userId = user && hasOwnPassword(user) ? user.id : null;

  useEffect(() => {
    if (!userId) {
      return;
    }
    realtime.connect();
    return () => realtime.disconnect();
  }, [userId]);

  return null;
}
