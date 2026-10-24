import { describe, expect, it } from "vitest";
import { clampZoom, isZoomed, MAX_SCALE, NO_ZOOM, panZoom, stepZoom, zoomTo, zoomTransform } from "./zoom";

const tile = { width: 400, height: 200 };

describe("zoom", () => {
  it("steps in and out by half, between 100% and the maximum", () => {
    const once = stepZoom(NO_ZOOM, 1, tile);
    expect(once).toEqual({ scale: 1.5, x: 0, y: 0 });
    expect(stepZoom(once, -1, tile)).toEqual(NO_ZOOM);
    expect(stepZoom(NO_ZOOM, -1, tile)).toEqual(NO_ZOOM);

    let zoom = NO_ZOOM;
    for (let i = 0; i < 20; i += 1) {
      zoom = stepZoom(zoom, 1, tile);
    }
    expect(zoom.scale).toBe(MAX_SCALE);
  });

  it("keeps the point under the fingers or the pointer in place", () => {
    // Zooming 2x on a point 100px right of centre moves the video 100px left
    const zoom = zoomTo(NO_ZOOM, 2, tile, { x: 100, y: 0 });

    expect(zoom).toEqual({ scale: 2, x: -100, y: 0 });
    // That spot of the video, (100 - x) / scale = 100px from its centre, is still under x = 100
    expect(zoom.x + zoom.scale * 100).toBe(100);
  });

  it("never lets an edge of the video come inside the tile", () => {
    expect(panZoom({ scale: 2, x: 0, y: 0 }, 500, -500, tile)).toEqual({ scale: 2, x: 200, y: -100 });
    expect(clampZoom({ scale: 1, x: 30, y: -30 }, tile)).toEqual(NO_ZOOM);
  });

  it("brings the video back to its frame when zooming out", () => {
    const zoomedOut = zoomTo({ scale: 3, x: 400, y: 200 }, 1.5, tile);

    expect(zoomedOut.scale).toBe(1.5);
    expect(Math.abs(zoomedOut.x)).toBeLessThanOrEqual(100);
    expect(Math.abs(zoomedOut.y)).toBeLessThanOrEqual(50);
  });

  it("describes itself as a CSS transform", () => {
    expect(isZoomed(NO_ZOOM)).toBe(false);
    expect(isZoomed({ scale: 1.5, x: 0, y: 0 })).toBe(true);
    expect(zoomTransform({ scale: 2, x: -100, y: 20 })).toBe("translate(-100px, 20px) scale(2)");
  });
});
