import type { ComponentType, ReactNode } from "react";
import type { LabKey } from "./types";

/**
 * How a lab is being used:
 * - `standalone`: the member plays with it on their own;
 * - `presenter`: the Teacher drives it in a class, and every change is shared;
 * - `follower`: a Student watches the Teacher's lab in a class and changes nothing.
 */
export type LabMode = "standalone" | "presenter" | "follower";

export interface LabViewProps<State> {
  state: State;
  /** Ignored in `follower` mode, where every control is disabled. */
  onChange(state: State): void;
  mode: LabMode;
  institutionId: string;
}

/**
 * One lab: its starting state, how to read a state that came from elsewhere
 * (the room, an address), and its screen. The state is plain JSON, small enough
 * to share with a class, and the screen draws the same thing from the same state.
 */
export interface LabModule<State> {
  key: LabKey;
  initial(): State;
  /** Reads a state shared by someone else, replacing what is missing or out of range. */
  parse(value: unknown): State;
  View: ComponentType<LabViewProps<State>>;
}

/** A lab's state as the rest of the app holds it: opaque, only ever made by that lab's own `initial` or `parse`. */
export type LabState = object;

export interface LabRenderProps {
  state: LabState;
  onChange(state: LabState): void;
  mode: LabMode;
  institutionId: string;
}

/** One lab with its state type erased, so labs of every kind sit in one table. */
export interface LabRunner {
  key: LabKey;
  initial(): LabState;
  parse(value: unknown): LabState;
  render(props: LabRenderProps): ReactNode;
}

/** Finds the lab for a key; given to screens that show labs without knowing them (the classroom). */
export type LabLookup = (key: LabKey) => LabRunner;
