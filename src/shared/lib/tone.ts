/** The categorical colours of the design system (see globals.css). */
export const TONES = ["sun", "coral", "mint", "sky", "grape", "pink"] as const;
export type Tone = (typeof TONES)[number];

/** Classes per tone, written out in full so Tailwind can see them. */
export const toneSolid: Record<Tone, string> = {
  sun: "bg-sun",
  coral: "bg-coral",
  mint: "bg-mint",
  sky: "bg-sky",
  grape: "bg-grape",
  pink: "bg-pink",
};

export const toneText: Record<Tone, string> = {
  sun: "text-sun",
  coral: "text-coral",
  mint: "text-mint",
  sky: "text-sky",
  grape: "text-grape",
  pink: "text-pink",
};

export const toneSoft: Record<Tone, string> = {
  sun: "bg-sun-soft text-sun-ink",
  coral: "bg-coral-soft text-coral-ink",
  mint: "bg-mint-soft text-mint-ink",
  sky: "bg-sky-soft text-sky-ink",
  grape: "bg-grape-soft text-grape-ink",
  pink: "bg-pink-soft text-pink-ink",
};

export const toneBorder: Record<Tone, string> = {
  sun: "border-sun",
  coral: "border-coral",
  mint: "border-mint",
  sky: "border-sky",
  grape: "border-grape",
  pink: "border-pink",
};

/** A small stable hash, so the same key always gets the same number. */
export function hashOf(key: string): number {
  let hash = 0;
  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

/** Picks a tone for a key (a subject code, a name), always the same one for the same key. */
export function toneFor(key: string): Tone {
  return TONES[hashOf(key) % TONES.length];
}
