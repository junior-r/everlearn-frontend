/**
 * The mechanics behind the physics labs, in closed form: the same inputs give
 * the same frame on every screen, which is what lets a class follow one lab.
 * Units are SI: metres, seconds, kilograms, newtons, degrees for angles.
 */

/** Surface gravity of the bodies a lab can be set on, in m/s². */
export const GRAVITY = { earth: 9.81, moon: 1.62, mars: 3.71, jupiter: 24.79 } as const;
export type Body = keyof typeof GRAVITY;
export const BODIES = Object.keys(GRAVITY) as Body[];

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// ─── Free fall ───

/** How long an object dropped from `height` takes to reach the ground. */
export const fallTime = (height: number, gravity: number) => Math.sqrt((2 * height) / gravity);

/** How fast it hits the ground. */
export const impactSpeed = (height: number, gravity: number) => Math.sqrt(2 * gravity * height);

/** How high it still is `time` seconds after being dropped. */
export const heightAt = (height: number, gravity: number, time: number) =>
  Math.max(0, height - (gravity * time * time) / 2);

// ─── Projectile ───

export interface Launch {
  speed: number;
  /** Above the horizontal. */
  angle: number;
  /** Height it is launched from. */
  height: number;
  gravity: number;
}

export interface Flight {
  time: number;
  range: number;
  maxHeight: number;
}

export function flightOf({ speed, angle, height, gravity }: Launch): Flight {
  const vx = speed * Math.cos(radians(angle));
  const vy = speed * Math.sin(radians(angle));
  const time = (vy + Math.sqrt(vy * vy + 2 * gravity * height)) / gravity;
  return { time, range: vx * time, maxHeight: height + (vy > 0 ? (vy * vy) / (2 * gravity) : 0) };
}

/** Where the projectile is `time` seconds after launch (never under the ground). */
export function projectileAt({ speed, angle, height, gravity }: Launch, time: number): { x: number; y: number } {
  return {
    x: speed * Math.cos(radians(angle)) * time,
    y: Math.max(0, height + speed * Math.sin(radians(angle)) * time - (gravity * time * time) / 2),
  };
}

// ─── Uniform and accelerated motion ───

export interface Mover {
  /** Starting position. */
  position: number;
  velocity: number;
  acceleration: number;
}

export const positionAt = ({ position, velocity, acceleration }: Mover, time: number) =>
  position + velocity * time + (acceleration * time * time) / 2;

export const velocityAt = ({ velocity, acceleration }: Mover, time: number) => velocity + acceleration * time;

/** The first moment in [0, until] when both are at the same place, or null if they never are. */
export function meetingTime(first: Mover, second: Mover, until: number): number | null {
  const a = (first.acceleration - second.acceleration) / 2;
  const b = first.velocity - second.velocity;
  const c = first.position - second.position;
  const inRange = (time: number) => time >= 0 && time <= until;
  let candidates: number[];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) {
      return Math.abs(c) < 1e-9 ? 0 : null;
    }
    candidates = [-c / b];
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return null;
    }
    const root = Math.sqrt(discriminant);
    candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)];
  }
  const times = candidates.filter(inRange).sort((left, right) => left - right);
  // Adding zero turns a -0 from the formula into 0
  return times.length > 0 ? times[0] + 0 : null;
}

// ─── Forces on an incline ───

export interface Incline {
  mass: number;
  /** Pushing the block up the slope. */
  force: number;
  /** Coefficient of friction, used both to start and to keep moving. */
  friction: number;
  angle: number;
  gravity: number;
}

export type Motion = "up" | "down" | "rest";

export interface ForceBalance {
  weight: number;
  normal: number;
  /** The part of the weight pulling down the slope. */
  downSlope: number;
  /** Friction along the slope, positive up the slope. */
  frictionForce: number;
  /** Net force along the slope, positive up the slope. */
  net: number;
  acceleration: number;
  motion: Motion;
}

/** Newton's second law along a slope, the block starting at rest. */
export function balanceOf({ mass, force, friction, angle, gravity }: Incline): ForceBalance {
  const weight = mass * gravity;
  const normal = weight * Math.cos(radians(angle));
  const downSlope = weight * Math.sin(radians(angle));
  const pull = force - downSlope;
  const maxFriction = friction * normal;
  if (Math.abs(pull) <= maxFriction + 1e-9) {
    return { weight, normal, downSlope, frictionForce: -pull, net: 0, acceleration: 0, motion: "rest" };
  }
  const direction = Math.sign(pull);
  const frictionForce = -direction * maxFriction;
  const net = pull + frictionForce;
  return {
    weight,
    normal,
    downSlope,
    frictionForce,
    net,
    acceleration: net / mass,
    motion: direction > 0 ? "up" : "down",
  };
}
