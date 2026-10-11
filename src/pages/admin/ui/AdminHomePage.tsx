"use client";

import { useDictionary } from "@/shared/i18n";

/** `/admin` has no content of its own: the admin shell forwards to the first section the user may open. */
export function AdminHomePage() {
  const { common } = useDictionary();
  return <p className="text-sm text-muted">{common.loading}</p>;
}
