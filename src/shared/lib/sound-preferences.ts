"use client";

import { useCallback, useSyncExternalStore } from "react";
import { playCue, type SoundCue } from "./sounds";

export const SOUND_LEVELS = ["low", "medium", "high"] as const;
export type SoundLevel = (typeof SOUND_LEVELS)[number];

export interface SoundPreferences {
  enabled: boolean;
  level: SoundLevel;
}

const VOLUME: Record<SoundLevel, number> = { low: 0.35, medium: 0.65, high: 1 };
const DEFAULTS: SoundPreferences = { enabled: true, level: "medium" };
const STORAGE_KEY = "everlearn:sounds";

/** Reads stored preferences; anything missing or unknown falls back to the defaults. */
export function parseSoundPreferences(stored: string | null): SoundPreferences {
  try {
    const value: unknown = stored ? JSON.parse(stored) : null;
    if (typeof value !== "object" || value === null) {
      return DEFAULTS;
    }
    const { enabled, level } = value as { enabled?: unknown; level?: unknown };
    return {
      enabled: typeof enabled === "boolean" ? enabled : DEFAULTS.enabled,
      level: SOUND_LEVELS.find((known) => known === level) ?? DEFAULTS.level,
    };
  } catch {
    return DEFAULTS;
  }
}

// One copy for the whole page, so the classroom switch and every place that plays a cue agree
let current: SoundPreferences | null = null;
const listeners = new Set<() => void>();

function read(): SoundPreferences {
  if (current === null) {
    try {
      current = parseSoundPreferences(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      current = DEFAULTS;
    }
  }
  return current;
}

function write(next: SoundPreferences): void {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Kept for this visit only when the browser refuses to store it
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The viewer's sound switch and volume, kept in this browser, and a way to change them. */
export function useSoundPreferences() {
  const preferences = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  const setEnabled = useCallback((enabled: boolean) => write({ ...read(), enabled }), []);
  const setLevel = useCallback((level: SoundLevel) => write({ ...read(), level }), []);
  return { ...preferences, setEnabled, setLevel };
}

/** Plays a cue at the viewer's volume, unless they switched sounds off. Stable across renders. */
export function useSoundCue(): (cue: SoundCue) => void {
  return useCallback((cue: SoundCue) => {
    const { enabled, level } = read();
    if (enabled) {
      playCue(cue, VOLUME[level]);
    }
  }, []);
}
