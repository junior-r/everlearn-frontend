"use client";

import { useEffect } from "react";
import { useSession } from "@/entities/session";
import { useDictionary, useLocalizedRouter } from "@/shared/i18n";

/** `/admin` has no content of its own; it forwards to the section the admin most likely wants. */
export function AdminHomePage() {
  const router = useLocalizedRouter();
  const { user } = useSession();
  const { common } = useDictionary();

  useEffect(() => {
    if (user) {
      router.replace(user.isPlatformAdmin ? "/admin/institutions" : "/admin/members");
    }
  }, [user, router]);

  return <p className="text-sm text-muted">{common.loading}</p>;
}
