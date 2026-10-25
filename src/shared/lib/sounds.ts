/** The moments that have a sound. */
export type SoundCue = "joined" | "someoneJoined" | "message" | "classStarted" | "handRaised";

/** One soft tone: its pitch in Hz, when it starts and how long it rings, in seconds. */
export interface Tone {
  frequency: number;
  at: number;
  length: number;
}

// Short, rising and quiet: sine tones on a pentatonic scale, so any two cues sound well together
export const CUES: Record<SoundCue, Tone[]> = {
  joined: [
    { frequency: 523.25, at: 0, length: 0.18 },
    { frequency: 783.99, at: 0.12, length: 0.3 },
  ],
  someoneJoined: [{ frequency: 659.25, at: 0, length: 0.25 }],
  message: [
    { frequency: 880, at: 0, length: 0.09 },
    { frequency: 1318.51, at: 0.07, length: 0.16 },
  ],
  classStarted: [
    { frequency: 523.25, at: 0, length: 0.16 },
    { frequency: 659.25, at: 0.13, length: 0.16 },
    { frequency: 783.99, at: 0.26, length: 0.36 },
  ],
  handRaised: [
    { frequency: 783.99, at: 0, length: 0.14 },
    { frequency: 1046.5, at: 0.11, length: 0.24 },
  ],
};

// Loud enough to notice over a voice at full volume, never louder than it
const PEAK_GAIN = 0.18;
const ATTACK_SECONDS = 0.012;

/** What playing a cue needs from Web Audio, so tests can hand in a fake. */
export type ToneContext = Pick<BaseAudioContext, "currentTime" | "destination" | "createOscillator" | "createGain">;

/** Schedules the tones of a cue on an audio context; `volume` goes from 0 (silent) to 1. */
export function scheduleCue(context: ToneContext, cue: SoundCue, volume: number): void {
  const peak = PEAK_GAIN * Math.min(1, Math.max(0, volume));
  if (peak === 0) {
    return;
  }
  for (const tone of CUES[cue]) {
    const start = context.currentTime + tone.at;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    // A ramp in and out, or the tone clicks
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + ATTACK_SECONDS);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.length);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + tone.length);
  }
}

let shared: AudioContext | null = null;

/**
 * Plays a cue. The browser lets a page make sound only after the viewer has
 * interacted with it, so a cue before that is silently skipped.
 */
export function playCue(cue: SoundCue, volume: number): void {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") {
    return;
  }
  try {
    shared ??= new AudioContext();
    if (shared.state === "suspended") {
      void shared.resume().catch(() => undefined);
    }
    scheduleCue(shared, cue, volume);
  } catch {
    // Without audio the class works the same, just quietly
  }
}
