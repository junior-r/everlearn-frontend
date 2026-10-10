import { describe, expect, it } from "vitest";
import { administeredInstitutionIds, canAccessAdmin } from "./permissions";
import type { SessionUser } from "./types";

const user = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: "u",
  email: "u@example.com",
  firstName: "U",
  lastName: "Ser",
  avatarUrl: null,
  status: "ACTIVE",
  isPlatformAdmin: false,
  memberships: [],
  ...overrides,
});

describe("admin access", () => {
  it("is offered to Platform Admins and Institution Admins only", () => {
    expect(canAccessAdmin(user({ isPlatformAdmin: true }))).toBe(true);
    expect(
      canAccessAdmin(user({ memberships: [{ id: "m", institutionId: "a", role: "ADMIN" }] })),
    ).toBe(true);
    expect(canAccessAdmin(user())).toBe(false);
    expect(
      canAccessAdmin(
        user({
          memberships: [
            { id: "m1", institutionId: "a", role: "TEACHER" },
            { id: "m2", institutionId: "b", role: "STUDENT" },
            { id: "m3", institutionId: "c", role: "COORDINATOR" },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("lists only the institutions where the user is an admin", () => {
    const mixed = user({
      memberships: [
        { id: "m1", institutionId: "a", role: "ADMIN" },
        { id: "m2", institutionId: "b", role: "TEACHER" },
        { id: "m3", institutionId: "c", role: "ADMIN" },
      ],
    });

    expect(administeredInstitutionIds(mixed)).toEqual(["a", "c"]);
  });
});
