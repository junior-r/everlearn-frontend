import { describe, expect, it } from "vitest";
import { parseSoundPreferences } from "./sound-preferences";

describe("parseSoundPreferences", () => {
  it("reads what was stored", () => {
    expect(parseSoundPreferences('{"enabled":false,"level":"high"}')).toEqual({ enabled: false, level: "high" });
  });

  it.each([null, "", "no es JSON", "[]", "null", '{"enabled":"yes","level":"loud"}'])(
    "falls back to sounds on at medium volume for %j",
    (stored) => {
      expect(parseSoundPreferences(stored)).toEqual({ enabled: true, level: "medium" });
    },
  );

  it("keeps the part that is valid", () => {
    expect(parseSoundPreferences('{"enabled":false,"level":"loud"}')).toEqual({ enabled: false, level: "medium" });
  });
});
