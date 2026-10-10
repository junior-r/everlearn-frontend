import type { Role, SessionUser } from "./types";

/** The roles the user holds in one institution; empty when they do not belong to it. */
export function rolesIn(user: SessionUser, institutionId: string | null): Role[] {
  return user.memberships
    .filter((membership) => membership.institutionId === institutionId)
    .map((membership) => membership.role);
}

/**
 * Whether to show the admin dashboard while acting in the given institution.
 * This only decides what the UI offers; the backend authorizes every request on its own.
 */
export function canAccessAdmin(user: SessionUser, activeInstitutionId: string | null): boolean {
  return user.isPlatformAdmin || rolesIn(user, activeInstitutionId).includes("ADMIN");
}

/** Whether the user may use the app at all yet, or must first replace a temporary password. */
export function hasOwnPassword(user: SessionUser): boolean {
  return !user.mustChangePassword;
}
