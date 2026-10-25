import { describe, expect, it } from "vitest";
import { CUES, scheduleCue, type SoundCue, type ToneContext } from "./sounds";

interface Recorded {
  frequency: number;
  start: number;
  stop: number;
  peak: number;
}

/** Plays Web Audio: records every tone scheduled on it. */
function fakeContext(currentTime = 10) {
  const tones: Recorded[] = [];
  const context = {
    currentTime,
    destination: {},
    createGain: () => {
      const node = {
        gain: {
          setValueAtTime: () => undefined,
          linearRampToValueAtTime: (value: number) => {
            tones[tones.length - 1].peak = value;
          },
          exponentialRampToValueAtTime: () => undefined,
        },
        connect: (target: unknown) => target,
      };
      return node;
    },
    createOscillator: () => {
      const tone: Recorded = { frequency: 0, start: 0, stop: 0, peak: 0 };
      tones.push(tone);
      return {
        type: "",
        frequency: { setValueAtTime: (value: number) => (tone.frequency = value) },
        connect: (gain: unknown) => gain,
        start: (at: number) => (tone.start = at),
        stop: (at: number) => (tone.stop = at),
      };
    },
  };
  return { context: context as unknown as ToneContext, tones };
}

describe("scheduleCue", () => {
  it("plays each tone of a cue from now, for as long as it rings", () => {
    const { context, tones } = fakeContext(10);

    scheduleCue(context, "joined", 1);

    expect(tones.map(({ frequency, start, stop }) => ({ frequency, start, stop }))).toEqual(
      CUES.joined.map((tone) => ({ frequency: tone.frequency, start: 10 + tone.at, stop: 10 + tone.at + tone.length })),
    );
  });

  it("is quieter at a lower volume and silent at none", () => {
    const loud = fakeContext();
    const soft = fakeContext();
    const silent = fakeContext();

    scheduleCue(loud.context, "message", 1);
    scheduleCue(soft.context, "message", 0.35);
    scheduleCue(silent.context, "message", 0);

    expect(soft.tones[0].peak).toBeLessThan(loud.tones[0].peak);
    expect(silent.tones).toHaveLength(0);
  });

  it("keeps every cue short and every tone audible", () => {
    for (const cue of Object.keys(CUES) as SoundCue[]) {
      const end = Math.max(...CUES[cue].map((tone) => tone.at + tone.length));
      expect(end).toBeLessThanOrEqual(0.7);
      expect(CUES[cue].every((tone) => tone.frequency >= 200 && tone.frequency <= 2000)).toBe(true);
    }
  });
});
