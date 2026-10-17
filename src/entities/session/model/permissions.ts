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
  "labs",
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

const INSTITUTION_SECTIONS = ADMIN_SECTIONS.filter((section) => section !== "institutions");

/**
 * The dashboard sections to offer while acting in the given institution:
 * - a Platform Admin manages institutions, and every section of one they have entered;
 * - an Institution Admin manages everything inside their institution, labs included (only those granted);
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

/**
 * Whether `/admin` itself has something to show: the figures of the platform
 * for a Platform Admin, or of the institution for its Institution Admin. Staff
 * only register members, so they go straight to that section.
 */
export function hasAdminDashboard(user: SessionUser, activeInstitutionId: string | null): boolean {
  return user.isPlatformAdmin || rolesIn(user, activeInstitutionId).includes("ADMIN");
}

export function canAccessAdmin(user: SessionUser, activeInstitutionId: string | null): boolean {
  return adminSections(user, activeInstitutionId).length > 0;
}

const BELOW_INSTITUTION_ADMIN: Role[] = ["COORDINATOR", "TEACHER", "STAFF", "GUARDIAN", "STUDENT"];
// Staff enrol Students, and with them the Guardians who answer for them
const REGISTERED_BY_STAFF: Role[] = ["GUARDIAN", "STUDENT"];

/** The roles the user may give when registering a member; mirrors the backend rule. */
export function registrableRoles(user: SessionUser, institutionId: string | null): Role[] {
  if (user.isPlatformAdmin) {
    return ["ADMIN", ...BELOW_INSTITUTION_ADMIN];
  }
  const roles = rolesIn(user, institutionId);
  if (roles.includes("ADMIN")) {
    return BELOW_INSTITUTION_ADMIN;
  }
  return roles.includes("STAFF") ? REGISTERED_BY_STAFF : [];
}

/**
 * Where the home screen sends someone whose role has a screen of its own: a
 * Principal to the academic overview, and someone who is only a Guardian to
 * their wards. Teachers and Students stay on the home screen, where their classes are.
 */
export function landingPath(roles: readonly Role[]): string | null {
  if (roles.includes("COORDINATOR")) {
    return "/principal";
  }
  const hasClasses = roles.includes("TEACHER") || roles.includes("STUDENT");
  return roles.includes("GUARDIAN") && !hasClasses ? "/guardian" : null;
}

/** Whether the user may use the app at all yet, or must first replace a temporary password. */
export function hasOwnPassword(user: SessionUser): boolean {
  return !user.mustChangePassword;
}
