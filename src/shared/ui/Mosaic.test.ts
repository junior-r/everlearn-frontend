import { describe, expect, it } from "vitest";
import { mosaicTiles } from "./Mosaic";

describe("mosaicTiles", () => {
  it("draws the same tiles for the same seed, so server and browser agree", () => {
    expect(mosaicTiles("Miembros", 8)).toEqual(mosaicTiles("Miembros", 8));
  });

  it("gives different seeds different mosaics", () => {
    expect(mosaicTiles("Miembros", 8)).not.toEqual(mosaicTiles("Horarios", 8));
  });

  it("never puts a shape on a ground of its own colour", () => {
    for (const tile of mosaicTiles("everlearn", 200)) {
      expect(tile.ground).not.toBe(tile.tone);
    }
  });
});
