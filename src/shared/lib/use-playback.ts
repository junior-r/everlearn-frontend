"use client";

import { useEffect, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Plays a simulation of `duration` seconds each time `run` changes, and
 * returns how far it has got. A `run` of 0 or below has not started (time 0).
 * With reduced motion the end is shown at once.
 */
export function usePlayback(run: number, duration: number): number {
  // Which run the time belongs to, so a new run starts from zero in the same render
  const [frame, setFrame] = useState({ run: 0, elapsed: 0 });
  const [isReduced] = useState(prefersReducedMotion);
  const plays = run > 0 && !isReduced && duration > 0;

  useEffect(() => {
    if (!plays) {
      return;
    }
    let request = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(duration, (now - start) / 1000);
      setFrame({ run, elapsed });
      if (elapsed < duration) {
        request = requestAnimationFrame(tick);
      }
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [plays, run, duration]);

  if (run <= 0) {
    return 0;
  }
  if (!plays) {
    return Math.max(0, duration);
  }
  return frame.run === run ? frame.elapsed : 0;
}
