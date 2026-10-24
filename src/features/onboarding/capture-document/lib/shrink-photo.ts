import { fitInside } from "./crop";

// A picked photo is not cropped to the card, so it keeps more pixels than a camera capture
const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.9;

/**
 * Re-encodes a picked photo as a JPEG whose longer side is at most 2400 px, upright
 * as the phone shot it, so it stays well under the backend's 5 MB limit.
 * Resolves with the original file when the browser cannot decode it.
 */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const output = fitInside(bitmap, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, output.width, output.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  return blob ?? file;
}
