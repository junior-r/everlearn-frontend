import { isLabKey, type LabKey } from "../model/types";

/** The participant attribute listing, comma separated, the labs the backend lets the Teacher share. */
export const LABS_ATTRIBUTE = "labs";

/** A lab on show in a class: its key and state, as the video-server keeps them in the room metadata. */
export interface SharedLab {
  labKey: LabKey;
  /** The lab's own state; each lab reads it with its own parser. */
  state: Record<string, unknown>;
  /** The Membership id of the Teacher who shares it. */
  sharedBy: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads the lab on show from the room metadata; null when nothing is shared or the metadata is not ours. */
export function parseSharedLab(metadata: string | undefined): SharedLab | null {
  if (!metadata) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(metadata);
  } catch {
    return null;
  }
  const lab = isRecord(value) ? value.lab : null;
  if (!isRecord(lab) || !isLabKey(lab.labKey) || !isRecord(lab.state) || typeof lab.sharedBy !== "string") {
    return null;
  }
  return { labKey: lab.labKey, state: lab.state, sharedBy: lab.sharedBy };
}

/** The labs listed in the `labs` attribute of a room token, known keys only. */
export function parseShareableLabs(attribute: string | undefined): LabKey[] {
  return (attribute ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(isLabKey);
}

/** A lab's state written into an address, so a Student can open what the class saw in their own lab. */
export function encodeLabState(state: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Reads a state written by `encodeLabState`; null for anything else. */
export function decodeLabState(encoded: string | null): Record<string, unknown> | null {
  if (!encoded) {
    return null;
  }
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const value: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}
