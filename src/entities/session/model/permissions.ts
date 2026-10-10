import type { SessionUser } from "./types";

/** Ids of the institutions where the user is an Institution Admin. */
export function administeredInstitutionIds(user: SessionUser): string[] {
  return user.memberships
    .filter((membership) => membership.role === "ADMIN")
    .map((membership) => membership.institutionId);
}

/**
 * Whether to show the admin dashboard. This only decides what the UI offers;
 * the backend authorizes every request on its own.
 */
export function canAccessAdmin(user: SessionUser): boolean {
  return user.isPlatformAdmin || administeredInstitutionIds(user).length > 0;
}
