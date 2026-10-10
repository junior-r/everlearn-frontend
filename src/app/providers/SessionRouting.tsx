"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { useSession } from "@/entities/session";
import { localizedPath, useLocale, useLocalizedRouter } from "@/shared/i18n";

const CHANGE_PASSWORD = "/change-password";
const SELECT_INSTITUTION = "/select-institution";
// Pages that make sense before an institution is chosen
const NO_INSTITUTION_NEEDED = [SELECT_INSTITUTION, CHANGE_PASSWORD, "/settings", "/login"];

/**
 * The two app-wide detours, enforced in one place so no page can forget them:
 * a temporary password must be replaced first, and a member of several
 * institutions must choose one. Both are also enforced or re-checked by the backend.
 */
export function SessionRouting() {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useSession();
  const { needsSelection } = useActiveInstitution();
  const isOn = (path: string) => pathname === localizedPath(locale, path);
  const mustChangePassword = user?.mustChangePassword === true && !isOn(CHANGE_PASSWORD);
  const mustSelect =
    !mustChangePassword && needsSelection && !NO_INSTITUTION_NEEDED.some((path) => isOn(path));

  useEffect(() => {
    if (mustChangePassword) {
      router.replace(CHANGE_PASSWORD);
    } else if (mustSelect) {
      router.replace(SELECT_INSTITUTION);
    }
    // `pathname` is a dependency on purpose: another navigation may land after this one
    // (the login page sends the user home), and the detour must then be applied again
  }, [mustChangePassword, mustSelect, pathname, router]);

  return null;
}
