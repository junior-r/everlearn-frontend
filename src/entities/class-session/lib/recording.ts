const MEGABYTE = 1_000_000;
const GIGABYTE = 1_000_000_000;

/** How big a recording is, in the reader's locale: megabytes, or gigabytes from 1 GB on. */
export function recordingSize(sizeBytes: number, locale: string): string {
  const inGigabytes = sizeBytes >= GIGABYTE;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: inGigabytes ? "gigabyte" : "megabyte",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(sizeBytes / (inGigabytes ? GIGABYTE : MEGABYTE));
}
