import { describe, expect, it } from "vitest";
import { fitInside, fitWidth, frameToSourceRect } from "./crop";

describe("frameToSourceRect", () => {
  it("scales the frame up when the video matches the container's proportions", () => {
    const rect = frameToSourceRect(
      { width: 1280, height: 960 },
      { width: 640, height: 480 },
      { x: 64, y: 100, width: 512, height: 323 },
    );

    expect(rect).toEqual({ x: 128, y: 200, width: 1024, height: 646 });
  });

  it("accounts for the sides hidden by object-fit: cover on a wider video", () => {
    // A 16:9 video in a 4:3 box is scaled by height; 160px of video is hidden on each side
    const rect = frameToSourceRect(
      { width: 1280, height: 720 },
      { width: 400, height: 300 },
      { x: 0, y: 0, width: 400, height: 300 },
    );

    expect(rect.x).toBeCloseTo(160);
    expect(rect.y).toBe(0);
    expect(rect.width).toBeCloseTo(960);
    expect(rect.height).toBeCloseTo(720);
  });

  it("accounts for the top and bottom hidden on a taller (portrait phone) video", () => {
    const rect = frameToSourceRect(
      { width: 720, height: 1280 },
      { width: 360, height: 270 },
      { x: 36, y: 45, width: 288, height: 180 },
    );

    // Scaled by width (0.5); (640 - 270) / 2 = 185 CSS px hidden above
    expect(rect).toEqual({ x: 72, y: 460, width: 576, height: 360 });
  });

  it("never returns a rectangle outside the video", () => {
    const rect = frameToSourceRect(
      { width: 640, height: 480 },
      { width: 640, height: 480 },
      { x: -50, y: 400, width: 800, height: 200 },
    );

    expect(rect).toEqual({ x: 0, y: 400, width: 640, height: 80 });
  });
});

describe("fitWidth", () => {
  it("shrinks large captures proportionally and leaves small ones alone", () => {
    expect(fitWidth({ width: 3200, height: 2000 }, 1600)).toEqual({ width: 1600, height: 1000 });
    expect(fitWidth({ width: 800, height: 500 }, 1600)).toEqual({ width: 800, height: 500 });
  });
});

describe("fitInside", () => {
  it("shrinks the longer side of a landscape or portrait photo", () => {
    expect(fitInside({ width: 4000, height: 3000 }, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitInside({ width: 3000, height: 4000 }, 2400)).toEqual({ width: 1800, height: 2400 });
  });

  it("never enlarges a small photo", () => {
    expect(fitInside({ width: 1200, height: 900 }, 2400)).toEqual({ width: 1200, height: 900 });
  });
});
