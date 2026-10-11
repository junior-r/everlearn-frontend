import { describe, expect, it } from "vitest";
import { assistantAudiences, canUseAssistant } from "./types";

describe("canUseAssistant", () => {
  it("offers the assistant to every role with a dashboard, and to a Platform Admin inside an institution", () => {
    for (const role of ["ADMIN", "COORDINATOR", "TEACHER", "STAFF", "STUDENT"]) {
      expect(canUseAssistant([role], false)).toBe(true);
    }
    expect(canUseAssistant([], true)).toBe(true);
  });

  it("does not offer it to Guardians or to someone without a role", () => {
    expect(canUseAssistant(["GUARDIAN"], false)).toBe(false);
    expect(canUseAssistant([], false)).toBe(false);
  });
});

describe("assistantAudiences", () => {
  it("tells admins and Students what the assistant can look up for them", () => {
    expect(assistantAudiences(["ADMIN"], false)).toEqual(["ADMIN"]);
    expect(assistantAudiences([], true)).toEqual(["ADMIN"]);
    expect(assistantAudiences(["STUDENT"], false)).toEqual(["STUDENT"]);
    expect(assistantAudiences(["STUDENT", "ADMIN"], false)).toEqual(["ADMIN", "STUDENT"]);
  });

  it("tells every other role that it has no data yet", () => {
    expect(assistantAudiences(["TEACHER"], false)).toEqual(["OTHER"]);
    expect(assistantAudiences(["STAFF", "COORDINATOR"], false)).toEqual(["OTHER"]);
  });
});
