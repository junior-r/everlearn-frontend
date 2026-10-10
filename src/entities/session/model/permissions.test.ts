import { describe, expect, it } from "vitest";
import { canAccessAdmin, hasOwnPassword, rolesIn } from "./permissions";
import type { SessionUser } from "./types";

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

// Institution Admin in A, Student in B, Teacher and Student in C
const mixed = user({
  memberships: [
    { id: "m1", institutionId: "a", role: "ADMIN" },
    { id: "m2", institutionId: "b", role: "STUDENT" },
    { id: "m3", institutionId: "c", role: "TEACHER" },
    { id: "m4", institutionId: "c", role: "STUDENT" },
  ],
});

describe("rolesIn", () => {
  it("returns only the roles held in the given institution", () => {
    expect(rolesIn(mixed, "a")).toEqual(["ADMIN"]);
    expect(rolesIn(mixed, "c")).toEqual(["TEACHER", "STUDENT"]);
    expect(rolesIn(mixed, "elsewhere")).toEqual([]);
    expect(rolesIn(mixed, null)).toEqual([]);
  });
});

describe("canAccessAdmin", () => {
  it("depends on the institution the user is acting in, not on being an admin somewhere", () => {
    expect(canAccessAdmin(mixed, "a")).toBe(true);
    expect(canAccessAdmin(mixed, "b")).toBe(false);
    expect(canAccessAdmin(mixed, "c")).toBe(false);
    expect(canAccessAdmin(mixed, null)).toBe(false);
  });

  it("is always offered to Platform Admins, who hold no memberships", () => {
    expect(canAccessAdmin(user({ isPlatformAdmin: true }), null)).toBe(true);
  });
});

describe("hasOwnPassword", () => {
  it("is false while the account still has a temporary password", () => {
    expect(hasOwnPassword(user())).toBe(true);
    expect(hasOwnPassword(user({ mustChangePassword: true }))).toBe(false);
  });
});
