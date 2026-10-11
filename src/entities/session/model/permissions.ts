import type { Role, SessionUser } from "./types";

/** The roles the user holds in one institution; empty when they do not belong to it. */
export function rolesIn(user: SessionUser, institutionId: string | null): Role[] {
  return user.memberships
    .filter((membership) => membership.institutionId === institutionId)
    .map((membership) => membership.role);
}

export const ADMIN_SECTIONS = [
  "institutions",
  "members",
  "reviews",
  "subjects",
  "pensums",
  "groups",
  "availability",
  "schedule",
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

const INSTITUTION_SECTIONS = ADMIN_SECTIONS.filter((section) => section !== "institutions");

/**
 * The dashboard sections to offer while acting in the given institution:
 * - a Platform Admin manages institutions, and every section of one they have entered;
 * - an Institution Admin manages everything inside their institution;
 * - Staff only register members (Students).
 * This decides what the UI shows; the backend authorizes every request on its own.
 */
export function adminSections(user: SessionUser, activeInstitutionId: string | null): AdminSection[] {
  if (user.isPlatformAdmin) {
    return activeInstitutionId ? [...ADMIN_SECTIONS] : ["institutions"];
  }
  const roles = rolesIn(user, activeInstitutionId);
  if (roles.includes("ADMIN")) {
    return INSTITUTION_SECTIONS;
  }
  return roles.includes("STAFF") ? ["members"] : [];
}

export function canAccessAdmin(user: SessionUser, activeInstitutionId: string | null): boolean {
  return adminSections(user, activeInstitutionId).length > 0;
}

const BELOW_INSTITUTION_ADMIN: Role[] = ["COORDINATOR", "TEACHER", "STAFF", "STUDENT"];

/** The roles the user may give when registering a member; mirrors the backend rule. */
export function registrableRoles(user: SessionUser, institutionId: string | null): Role[] {
  if (user.isPlatformAdmin) {
    return ["ADMIN", ...BELOW_INSTITUTION_ADMIN];
  }
  const roles = rolesIn(user, institutionId);
  if (roles.includes("ADMIN")) {
    return BELOW_INSTITUTION_ADMIN;
  }
  return roles.includes("STAFF") ? ["STUDENT"] : [];
}

/** Whether the user may use the app at all yet, or must first replace a temporary password. */
export function hasOwnPassword(user: SessionUser): boolean {
  return !user.mustChangePassword;
}
