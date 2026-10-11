import { describe, expect, it } from "vitest";
import { fileName } from "./download";

describe("fileName", () => {
  it("keeps accents and spaces, which every file system accepts", () => {
    expect(fileName("Matemática 1ro A", "csv")).toBe("Matemática 1ro A.csv");
  });

  it("drops the characters a file name cannot have", () => {
    expect(fileName('Lengua/Literatura: "2do B"?', "csv")).toBe("Lengua Literatura 2do B.csv");
    expect(fileName("  ..\\..\\secreto  ", "csv")).toBe(".. .. secreto.csv");
  });

  it("falls back to a plain name when nothing usable is left", () => {
    expect(fileName(' /:*? ', "csv")).toBe("archivo.csv");
  });
});
