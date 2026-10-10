import { describe, expect, it } from "vitest";
import { isLocale, localizedPath } from "./config";
import en from "./dictionaries/en.json";
import es from "./dictionaries/es.json";
import { errorMessage, format } from "./format";
import { negotiateLocale } from "./negotiate-locale";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("dictionaries", () => {
  it("have exactly the same keys in every language", () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(es).sort());
  });

  it("keep the same placeholders in every language", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

    expect(placeholders(en.home.welcome)).toEqual(placeholders(es.home.welcome));
    expect(placeholders(en.home.signedInAs)).toEqual(placeholders(es.home.signedInAs));
  });
});

describe("negotiateLocale", () => {
  it.each([
    ["es-VE,es;q=0.9,en;q=0.8", "es"],
    ["en-US,en;q=0.9", "en"],
    ["en;q=0.4, es;q=0.9", "es"],
    ["fr-FR,fr;q=0.9,en;q=0.5", "en"],
    ["EN-gb", "en"],
  ])("picks the best supported language from %s", (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });

  it.each([
    ["no header", null],
    ["an empty header", ""],
    ["only unsupported languages", "fr-FR,de;q=0.8"],
    ["a wildcard", "*"],
    ["a language explicitly refused with q=0", "en;q=0"],
    ["garbage", ";;;,q=,=1"],
  ])("falls back to Spanish for %s", (_label, header) => {
    expect(negotiateLocale(header)).toBe("es");
  });
});

describe("locale paths", () => {
  it("prefixes paths with the locale", () => {
    expect(localizedPath("es", "/")).toBe("/es");
    expect(localizedPath("en", "/login")).toBe("/en/login");
  });

  it("recognises only supported locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("ES")).toBe(false);
  });
});

describe("format", () => {
  it("fills placeholders and leaves unknown ones untouched", () => {
    expect(format(es.home.welcome, { name: "Ada" })).toBe("Te damos la bienvenida, Ada");
    expect(format("{a} and {b}", { a: "x" })).toBe("x and {b}");
  });
});

describe("errorMessage", () => {
  it("returns nothing when there is no error", () => {
    expect(errorMessage(es.errors, null)).toBeNull();
    expect(errorMessage(es.errors, "")).toBeNull();
  });

  it("maps known backend codes to the dictionary text", () => {
    expect(errorMessage(es.errors, "INVALID_CREDENTIALS")).toBe(
      "El correo o la contraseña no son correctos.",
    );
    expect(errorMessage(en.errors, "INVALID_CREDENTIALS")).toBe(
      "The email or password is incorrect.",
    );
  });

  it("never echoes an unknown code, including inherited object keys", () => {
    expect(errorMessage(es.errors, "<script>alert(1)</script>")).toBe(es.errors.fallback);
    expect(errorMessage(es.errors, "constructor")).toBe(es.errors.fallback);
    expect(errorMessage(es.errors, "toString")).toBe(es.errors.fallback);
  });
});
