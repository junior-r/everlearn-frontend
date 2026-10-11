import type { CSSProperties } from "react";
import { cn } from "@/shared/lib/cn";
import { hashOf, TONES, toneSoft, toneSolid, toneText, type Tone } from "@/shared/lib/tone";

const SHAPES = [
  "circle",
  "quarter-tl",
  "quarter-tr",
  "quarter-bl",
  "quarter-br",
  "half",
  "stripes",
  "dots",
  "ring",
  "diamond",
] as const;
type Shape = (typeof SHAPES)[number];

export interface MosaicTile {
  shape: Shape;
  tone: Tone;
  /** Tone of the tile behind the shape. */
  ground: Tone;
}

/**
 * The tiles of a mosaic for a seed. Deterministic, so the server and the
 * browser draw the same pattern and each page keeps its own.
 */
export function mosaicTiles(seed: string, count: number): MosaicTile[] {
  let state = hashOf(seed) || 1;
  const next = (size: number) => {
    // Linear congruential generator: enough randomness for decoration
    state = (state * 1664525 + 1013904223) >>> 0;
    return Math.floor((state / 2 ** 32) * size);
  };
  return Array.from({ length: count }, () => {
    const tone = TONES[next(TONES.length)];
    // Never the same tone behind the shape, or it would disappear
    const ground = TONES[(TONES.indexOf(tone) + 1 + next(TONES.length - 1)) % TONES.length];
    return { shape: SHAPES[next(SHAPES.length)], tone, ground };
  });
}

const filled: Partial<Record<Shape, string>> = {
  circle: "inset-[14%] rounded-full",
  "quarter-tl": "inset-0 rounded-br-full",
  "quarter-tr": "inset-0 rounded-bl-full",
  "quarter-bl": "inset-0 rounded-tr-full",
  "quarter-br": "inset-0 rounded-tl-full",
  half: "inset-x-0 bottom-0 h-1/2 rounded-t-full",
  diamond: "inset-[20%] rotate-45 rounded-[14%]",
};

const drawn: Partial<Record<Shape, string>> = {
  stripes: "pattern-stripes",
  dots: "pattern-dots",
  ring: "pattern-ring",
};

interface MosaicProps {
  seed: string;
  columns: number;
  rows: number;
  /** Tiles appear one after another instead of all at once. */
  animated?: boolean;
  className?: string;
}

/** A decorative grid of geometric tiles: the visual signature of the app. Hidden from assistive technology. */
export function Mosaic({ seed, columns, rows, animated = false, className }: MosaicProps) {
  return (
    <div
      aria-hidden
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {mosaicTiles(seed, columns * rows).map((tile, index) => (
        <div
          key={index}
          className={cn(
            "relative aspect-square overflow-hidden rounded-[16%]",
            toneSoft[tile.ground],
            animated && "animate-pop",
          )}
          style={animated ? ({ animationDelay: `${index * 20}ms` } as CSSProperties) : undefined}
        >
          <span
            className={cn(
              "absolute",
              filled[tile.shape] && cn(filled[tile.shape], toneSolid[tile.tone]),
              drawn[tile.shape] && cn("inset-0", drawn[tile.shape], toneText[tile.tone]),
            )}
          />
        </div>
      ))}
    </div>
  );
}
