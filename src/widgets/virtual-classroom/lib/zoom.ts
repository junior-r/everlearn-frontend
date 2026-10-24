/**
 * A viewer's own zoom on a video: how much it is enlarged and how far it is
 * moved, in pixels from the centre of its tile. Nobody else sees it.
 */
export interface Zoom {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** A point on the tile, in pixels from its centre. */
export interface Point {
  x: number;
  y: number;
}

export const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };
export const MAX_SCALE = 4;
const STEP = 0.5;

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(1, scale));
// `|| 0` turns the -0 that clamping a negative offset to 0 gives into a plain 0
const within = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value)) || 0;

/** Keeps the video covering its tile: zoomed in, an edge never comes inside the frame. */
export function clampZoom(zoom: Zoom, size: Size): Zoom {
  const scale = clampScale(zoom.scale);
  const maxX = ((scale - 1) * size.width) / 2;
  const maxY = ((scale - 1) * size.height) / 2;
  return {
    scale,
    x: within(zoom.x, maxX),
    y: within(zoom.y, maxY),
  };
}

/** Changes the scale keeping `focus` (by default the centre) under the same spot of the video. */
export function zoomTo(zoom: Zoom, scale: number, size: Size, focus: Point = { x: 0, y: 0 }): Zoom {
  const next = clampScale(scale);
  const ratio = next / zoom.scale;
  return clampZoom(
    { scale: next, x: focus.x - (focus.x - zoom.x) * ratio, y: focus.y - (focus.y - zoom.y) * ratio },
    size,
  );
}

/** One step in or out, as the buttons do. */
export function stepZoom(zoom: Zoom, direction: 1 | -1, size: Size): Zoom {
  return zoomTo(zoom, zoom.scale + direction * STEP, size);
}

/** Moves a zoomed video by a drag of (dx, dy) pixels. */
export function panZoom(zoom: Zoom, dx: number, dy: number, size: Size): Zoom {
  return clampZoom({ ...zoom, x: zoom.x + dx, y: zoom.y + dy }, size);
}

export const isZoomed = (zoom: Zoom) => zoom.scale > 1;

/** The CSS transform that draws the zoom; the element's transform origin is its centre. */
export const zoomTransform = (zoom: Zoom) => `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
