import { describe, expect, it } from "vitest";
import {
  balanceOf,
  fallTime,
  flightOf,
  GRAVITY,
  heightAt,
  impactSpeed,
  meetingTime,
  positionAt,
  projectileAt,
  velocityAt,
} from "./physics";

describe("free fall", () => {
  it("takes √(2h/g) to fall and hits the ground at √(2gh)", () => {
    expect(fallTime(20, GRAVITY.earth)).toBeCloseTo(2.019, 3);
    expect(impactSpeed(20, GRAVITY.earth)).toBeCloseTo(19.81, 2);
  });

  it("falls slower on the Moon than on Earth from the same height", () => {
    expect(fallTime(20, GRAVITY.moon)).toBeGreaterThan(fallTime(20, GRAVITY.earth));
  });

  it("never goes under the ground", () => {
    expect(heightAt(20, GRAVITY.earth, 1)).toBeCloseTo(15.095, 3);
    expect(heightAt(20, GRAVITY.earth, 10)).toBe(0);
  });
});

describe("projectile", () => {
  it("goes furthest at 45° from the ground, with the textbook range v²/g", () => {
    const flight = flightOf({ speed: 20, angle: 45, height: 0, gravity: 10 });
    expect(flight.range).toBeCloseTo(40);
    expect(flight.maxHeight).toBeCloseTo(10);
    expect(flight.time).toBeCloseTo(2.828, 3);
    expect(flightOf({ speed: 20, angle: 30, height: 0, gravity: 10 }).range).toBeLessThan(flight.range);
  });

  it("falls straight from a height when thrown horizontally", () => {
    const flight = flightOf({ speed: 10, angle: 0, height: 20, gravity: 10 });
    expect(flight.time).toBeCloseTo(2);
    expect(flight.range).toBeCloseTo(20);
    expect(flight.maxHeight).toBe(20);
  });

  it("is where the equations of motion put it", () => {
    const launch = { speed: 20, angle: 90, height: 0, gravity: 10 };
    expect(projectileAt(launch, 2)).toMatchObject({ y: 20 });
    expect(projectileAt(launch, 10).y).toBe(0);
  });
});

describe("uniform and accelerated motion", () => {
  const steady = { position: 0, velocity: 10, acceleration: 0 };
  const starting = { position: 0, velocity: 0, acceleration: 2 };

  it("moves as x = x0 + v t + a t²/2", () => {
    expect(positionAt(steady, 3)).toBe(30);
    expect(positionAt(starting, 3)).toBe(9);
    expect(velocityAt(starting, 3)).toBe(6);
  });

  it("finds when one catches up with the other", () => {
    // 10 t = t² meets again at t = 10
    expect(meetingTime(steady, starting, 20)).toBe(0);
    expect(meetingTime({ ...steady, position: -1 }, starting, 20)).toBeCloseTo(0.101, 3);
    expect(meetingTime({ position: 100, velocity: 0, acceleration: 0 }, steady, 20)).toBe(10);
  });

  it("knows when they never meet", () => {
    expect(meetingTime({ position: 5, velocity: 10, acceleration: 0 }, steady, 20)).toBeNull();
    expect(meetingTime({ position: 1000, velocity: 0, acceleration: 0 }, steady, 20)).toBeNull();
  });
});

describe("forces on an incline", () => {
  it("accelerates a pushed block on a frictionless floor by F/m", () => {
    const balance = balanceOf({ mass: 2, force: 10, friction: 0, angle: 0, gravity: 10 });
    expect(balance).toMatchObject({ weight: 20, normal: 20, net: 10, acceleration: 5, motion: "up" });
  });

  it("stays at rest while friction can hold it", () => {
    const balance = balanceOf({ mass: 10, force: 20, friction: 0.5, angle: 0, gravity: 10 });
    expect(balance).toMatchObject({ net: 0, acceleration: 0, motion: "rest", frictionForce: -20 });
  });

  it("slides down a steep slope when friction cannot hold it", () => {
    const balance = balanceOf({ mass: 1, force: 0, friction: 0.1, angle: 45, gravity: 10 });
    expect(balance.motion).toBe("down");
    expect(balance.acceleration).toBeCloseTo(-(7.071 - 0.707), 2);
  });

  it("pushed hard enough, goes up the slope against friction and weight", () => {
    const balance = balanceOf({ mass: 1, force: 20, friction: 0.2, angle: 30, gravity: 10 });
    expect(balance.motion).toBe("up");
    expect(balance.acceleration).toBeCloseTo(20 - 5 - 1.732, 2);
  });
});
