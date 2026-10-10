export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

// ISO/IEC 7810 ID-1, the size of ID cards and driving licences
export const ID_CARD_ASPECT_RATIO = 85.6 / 53.98;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Maps a frame drawn over an `object-fit: cover` video (in CSS pixels of its
 * container) to the matching rectangle in the camera's own pixels, so the
 * saved photo contains exactly what the user saw inside the frame.
 */
export function frameToSourceRect(source: Size, container: Size, frame: Rect): Rect {
  // `cover` scales the video until it fills the container, cropping the overflow equally on both sides
  const scale = Math.max(container.width / source.width, container.height / source.height);
  const hiddenX = (source.width * scale - container.width) / 2;
  const hiddenY = (source.height * scale - container.height) / 2;

  const x = clamp((frame.x + hiddenX) / scale, 0, source.width);
  const y = clamp((frame.y + hiddenY) / scale, 0, source.height);
  return {
    x,
    y,
    width: clamp(frame.width / scale, 0, source.width - x),
    height: clamp(frame.height / scale, 0, source.height - y),
  };
}

/** Shrinks a size to fit within `maxWidth`, keeping its proportions. Never enlarges. */
export function fitWidth(size: Size, maxWidth: number): Size {
  const ratio = Math.min(1, maxWidth / size.width);
  return { width: Math.round(size.width * ratio), height: Math.round(size.height * ratio) };
}
