"use client";

import { ArrowCounterClockwiseIcon, PlayIcon } from "@phosphor-icons/react/dist/ssr";
import {
  formatQuantity,
  isFields,
  LabStage,
  numberIn,
  runOf,
  type LabModule,
  type LabViewProps,
} from "@/entities/lab";
import { format, useDictionary, useLocale } from "@/shared/i18n";
import { usePlayback } from "@/shared/lib/use-playback";
import { Button, RangeField } from "@/shared/ui";
import { balanceOf, GRAVITY } from "../lib/physics";

export interface ForcesState {
  mass: number;
  force: number;
  friction: number;
  angle: number;
  run: number;
}

/** How long a run lasts, in seconds. */
const DURATION = 3;
const WIDTH = 480;
const HEIGHT = 300;
const BASE = { x: 40, y: 262 };
const SLOPE = 330;
const BLOCK = 34;
/** Pixels per metre the block slides. */
const PIXELS_PER_METRE = 24;
const LONGEST_ARROW = 90;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

interface Point {
  x: number;
  y: number;
}

/** A force drawn from a point, with its head; nothing for a force too small to see. */
function Arrow({ from, to, className }: { from: Point; to: Point; className: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 4) {
    return null;
  }
  const ux = dx / length;
  const uy = dy / length;
  const head = 9;
  const left = { x: to.x - ux * head - uy * head * 0.55, y: to.y - uy * head + ux * head * 0.55 };
  const right = { x: to.x - ux * head + uy * head * 0.55, y: to.y - uy * head - ux * head * 0.55 };
  return (
    <g className={className}>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeWidth={3} strokeLinecap="round" className="stroke-current" />
      <polygon points={`${to.x},${to.y} ${left.x},${left.y} ${right.x},${right.y}`} className="fill-current" />
    </g>
  );
}

function ForcesView({ state, onChange, mode }: LabViewProps<ForcesState>) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.forces;
  const isFollowing = mode === "follower";
  const balance = balanceOf({ ...state, gravity: GRAVITY.earth });
  const elapsed = usePlayback(state.run, DURATION);
  const time = state.run === 0 ? 0 : elapsed;
  const angle = radians(state.angle);
  const along = { x: Math.cos(angle), y: -Math.sin(angle) };
  const outward = { x: -Math.sin(angle), y: -Math.cos(angle) };
  const travelled = (balance.acceleration * time * time) / 2;
  const distance = Math.min(SLOPE * 0.88, Math.max(SLOPE * 0.12, SLOPE / 2 + travelled * PIXELS_PER_METRE));
  const center = {
    x: BASE.x + along.x * distance + outward.x * (BLOCK / 2),
    y: BASE.y + along.y * distance + outward.y * (BLOCK / 2),
  };
  const top = { x: BASE.x + along.x * SLOPE, y: BASE.y + along.y * SLOPE };
  const biggest = Math.max(balance.weight, state.force, balance.normal, 1);
  const length = (force: number) => (force / biggest) * LONGEST_ARROW;
  const toward = (direction: Point, force: number): Point => ({
    x: center.x + direction.x * length(force),
    y: center.y + direction.y * length(force),
  });
  const quantity = (value: number, unit: string, digits?: number) => formatQuantity(locale, value, unit, digits);
  const change = (patch: Partial<ForcesState>) => onChange({ ...state, ...patch, run: 0 });

  return (
    <LabStage
      visualLabel={format(text.drawing, { angle: quantity(state.angle, labs.units.degree) })}
      readingsLabel={labs.common.readings}
      controls={
        <>
          <RangeField
            label={text.mass}
            value={state.mass}
            min={1}
            max={50}
            step={1}
            display={quantity(state.mass, labs.units.kilogram)}
            disabled={isFollowing}
            onChange={(mass) => change({ mass })}
          />
          <RangeField
            label={text.force}
            value={state.force}
            min={0}
            max={500}
            step={5}
            display={quantity(state.force, labs.units.newton)}
            disabled={isFollowing}
            onChange={(force) => change({ force })}
          />
          <RangeField
            label={text.friction}
            value={state.friction}
            min={0}
            max={1}
            step={0.05}
            display={quantity(state.friction, "")}
            disabled={isFollowing}
            onChange={(friction) => change({ friction })}
          />
          <RangeField
            label={text.angle}
            value={state.angle}
            min={0}
            max={60}
            step={1}
            display={quantity(state.angle, labs.units.degree, 0)}
            disabled={isFollowing}
            onChange={(value) => change({ angle: value })}
          />
        </>
      }
      actions={
        <>
          <Button size="sm" disabled={isFollowing} onClick={() => onChange({ ...state, run: state.run + 1 })}>
            <PlayIcon aria-hidden weight="fill" className="size-4" />
            {text.release}
          </Button>
          <Button size="sm" variant="secondary" disabled={isFollowing} onClick={() => change({})}>
            <ArrowCounterClockwiseIcon aria-hidden weight="bold" className="size-4" />
            {labs.common.reset}
          </Button>
        </>
      }
      visual={
        <div className="flex flex-col">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden className="block h-auto w-full">
            <polygon points={`${BASE.x},${BASE.y} ${top.x},${top.y} ${top.x},${BASE.y}`} className="fill-line" />
            <line x1={0} x2={WIDTH} y1={BASE.y} y2={BASE.y} className="stroke-muted" strokeWidth={2} />
            <rect
              x={center.x - BLOCK / 2}
              y={center.y - BLOCK / 2}
              width={BLOCK}
              height={BLOCK}
              rx={6}
              transform={`rotate(${-state.angle} ${center.x} ${center.y})`}
              className="fill-brand"
            />
            <Arrow from={center} to={toward(along, state.force)} className="text-mint" />
            <Arrow from={center} to={toward({ x: 0, y: 1 }, balance.weight)} className="text-foreground" />
            <Arrow from={center} to={toward(outward, balance.normal)} className="text-sky" />
            <Arrow
              from={center}
              to={toward({ x: along.x * Math.sign(balance.frictionForce), y: along.y * Math.sign(balance.frictionForce) }, Math.abs(balance.frictionForce))}
              className="text-coral"
            />
          </svg>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-surface px-3 py-2 text-xs">
            {[
              { label: text.force, swatch: "bg-mint" },
              { label: text.weight, swatch: "bg-foreground" },
              { label: text.normal, swatch: "bg-sky" },
              { label: text.frictionForce, swatch: "bg-coral" },
            ].map(({ label, swatch }) => (
              <li key={label} className="flex items-center gap-1.5">
                <span aria-hidden className={`h-1 w-4 rounded-full ${swatch}`} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      }
      readings={[
        { label: text.weight, value: quantity(balance.weight, labs.units.newton) },
        { label: text.normal, value: quantity(balance.normal, labs.units.newton) },
        { label: text.downSlope, value: quantity(balance.downSlope, labs.units.newton) },
        { label: text.frictionForce, value: quantity(Math.abs(balance.frictionForce), labs.units.newton) },
        { label: text.net, value: quantity(balance.net, labs.units.newton) },
        { label: text.acceleration, value: quantity(balance.acceleration, labs.units.acceleration) },
        { label: text.motion, value: text.motions[balance.motion] },
      ]}
    />
  );
}

/** A block on a ramp: the forces on it, and whether it moves (Newton's second law with friction). */
export const forcesLab: LabModule<ForcesState> = {
  key: "forces",
  initial: () => ({ mass: 10, force: 80, friction: 0.3, angle: 20, run: 0 }),
  parse(value) {
    const fields = isFields(value) ? value : {};
    return {
      mass: numberIn(fields.mass, 1, 50, 10),
      force: numberIn(fields.force, 0, 500, 80),
      friction: numberIn(fields.friction, 0, 1, 0.3),
      angle: numberIn(fields.angle, 0, 60, 20),
      run: runOf(fields.run),
    };
  },
  View: ForcesView,
};
