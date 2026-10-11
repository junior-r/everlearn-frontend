import { describe, expect, it } from "vitest";
import {
  adminSections,
  canAccessAdmin,
  hasOwnPassword,
  registrableRoles,
  rolesIn,
} from "./permissions";
import type { Role, SessionUser } from "./types";

const user = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: "u",
  email: "u@example.com",
  firstName: "U",
  lastName: "Ser",
  avatarUrl: null,
  status: "ACTIVE",
  isPlatformAdmin: false,
  mustChangePassword: false,
  googleLinked: false,
  memberships: [],
  ...overrides,
});
const memberOf = (institutionId: string, ...roles: Role[]) =>
  user({ memberships: roles.map((role, index) => ({ id: `m${index}`, institutionId, role })) });

// Institution Admin in A, Student in B, Teacher and Student in C
const mixed = user({
  memberships: [
    { id: "m1", institutionId: "a", role: "ADMIN" },
    { id: "m2", institutionId: "b", role: "STUDENT" },
    { id: "m3", institutionId: "c", role: "TEACHER" },
    { id: "m4", institutionId: "c", role: "STUDENT" },
  ],
});
const platformAdmin = user({ isPlatformAdmin: true });

describe("rolesIn", () => {
  it("returns only the roles held in the given institution", () => {
    expect(rolesIn(mixed, "a")).toEqual(["ADMIN"]);
    expect(rolesIn(mixed, "c")).toEqual(["TEACHER", "STUDENT"]);
    expect(rolesIn(mixed, "elsewhere")).toEqual([]);
    expect(rolesIn(mixed, null)).toEqual([]);
  });
});

describe("adminSections", () => {
  it("gives a Platform Admin only Institutions until they enter one", () => {
    expect(adminSections(platformAdmin, null)).toEqual(["institutions"]);
    expect(adminSections(platformAdmin, "any")).toContain("members");
    expect(adminSections(platformAdmin, "any")).toContain("institutions");
  });

  it("gives an Institution Admin every section of their institution, but not Institutions", () => {
    const sections = adminSections(memberOf("a", "ADMIN"), "a");

    expect(sections).toEqual([
      "members", "reviews", "subjects", "pensums", "groups", "availability", "schedule",
    ]);
  });

  it("gives Staff only member registration", () => {
    expect(adminSections(memberOf("a", "STAFF"), "a")).toEqual(["members"]);
  });

  it.each<Role>(["TEACHER", "STUDENT", "COORDINATOR", "GUARDIAN"])("gives a %s nothing", (role) => {
    expect(adminSections(memberOf("a", role), "a")).toEqual([]);
  });

  it("depends on the institution the user is acting in, not on being an admin somewhere", () => {
    expect(canAccessAdmin(mixed, "a")).toBe(true);
    expect(canAccessAdmin(mixed, "b")).toBe(false);
    expect(canAccessAdmin(mixed, "c")).toBe(false);
    expect(canAccessAdmin(mixed, null)).toBe(false);
    expect(canAccessAdmin(platformAdmin, null)).toBe(true);
  });
});

describe("registrableRoles", () => {
  it("lets each level register only the levels below it", () => {
    expect(registrableRoles(platformAdmin, "a")).toEqual([
      "ADMIN", "COORDINATOR", "TEACHER", "STAFF", "STUDENT",
    ]);
    expect(registrableRoles(memberOf("a", "ADMIN"), "a")).toEqual([
      "COORDINATOR", "TEACHER", "STAFF", "STUDENT",
    ]);
    expect(registrableRoles(memberOf("a", "STAFF"), "a")).toEqual(["STUDENT"]);
    expect(registrableRoles(memberOf("a", "TEACHER"), "a")).toEqual([]);
  });

  it("uses the role held in the institution being acted on", () => {
    expect(registrableRoles(memberOf("a", "ADMIN"), "b")).toEqual([]);
    expect(registrableRoles(memberOf("a", "STAFF", "ADMIN"), "a")).toContain("TEACHER");
  });
});

describe("hasOwnPassword", () => {
  it("is false while the account still has a temporary password", () => {
    expect(hasOwnPassword(user())).toBe(true);
    expect(hasOwnPassword(user({ mustChangePassword: true }))).toBe(false);
  });
});
