"use client";

import { ArrowCounterClockwiseIcon, PlayIcon } from "@phosphor-icons/react/dist/ssr";
import {
  formatQuantity,
  isFields,
  LabStage,
  nextRun,
  numberIn,
  oneOf,
  runOf,
  stoppedRun,
  type LabModule,
  type LabViewProps,
} from "@/entities/lab";
import { format, useDictionary, useLocale } from "@/shared/i18n";
import { usePlayback } from "@/shared/lib/use-playback";
import { Button, RangeField, SelectField } from "@/shared/ui";
import { BODIES, flightOf, GRAVITY, projectileAt, type Body } from "../lib/physics";

export interface ProjectileState {
  speed: number;
  angle: number;
  height: number;
  body: Body;
  run: number;
}

const WIDTH = 480;
const HEIGHT = 300;
const MARGIN = 28;
/** Points along the drawn path. */
const PATH_STEPS = 60;

function ProjectileView({ state, onChange, mode }: LabViewProps<ProjectileState>) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.projectile;
  const isFollowing = mode === "follower";
  const launch = { speed: state.speed, angle: state.angle, height: state.height, gravity: GRAVITY[state.body] };
  const flight = flightOf(launch);
  const elapsed = usePlayback(state.run, flight.time);
  // One scale for both axes, so the path keeps its true shape
  const scale = Math.min(
    (WIDTH - 2 * MARGIN) / Math.max(flight.range, 1),
    (HEIGHT - 2 * MARGIN) / Math.max(flight.maxHeight, 1),
  );
  const toScreen = ({ x, y }: { x: number; y: number }) => ({ x: MARGIN + x * scale, y: HEIGHT - MARGIN - y * scale });
  const path = Array.from({ length: PATH_STEPS + 1 }, (_, step) => toScreen(projectileAt(launch, (flight.time * step) / PATH_STEPS)))
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const ball = toScreen(projectileAt(launch, elapsed));
  const quantity = (value: number, unit: string, digits?: number) => formatQuantity(locale, value, unit, digits);
  const change = (patch: Partial<ProjectileState>) => onChange({ ...state, ...patch, run: stoppedRun(state.run) });

  return (
    <LabStage
      visualLabel={format(text.drawing, {
        speed: quantity(state.speed, labs.units.speed),
        angle: quantity(state.angle, labs.units.degree, 0),
      })}
      readingsLabel={labs.common.readings}
      controls={
        <>
          <RangeField
            label={text.speed}
            value={state.speed}
            min={1}
            max={50}
            step={1}
            display={quantity(state.speed, labs.units.speed)}
            disabled={isFollowing}
            onChange={(speed) => change({ speed })}
          />
          <RangeField
            label={text.angle}
            value={state.angle}
            min={0}
            max={90}
            step={1}
            display={quantity(state.angle, labs.units.degree, 0)}
            disabled={isFollowing}
            onChange={(angle) => change({ angle })}
          />
          <RangeField
            label={text.height}
            value={state.height}
            min={0}
            max={50}
            step={1}
            display={quantity(state.height, labs.units.metre)}
            disabled={isFollowing}
            onChange={(height) => change({ height })}
          />
          <SelectField
            label={text.body}
            value={state.body}
            options={BODIES.map((body) => ({ value: body, label: labs.bodies[body] }))}
            disabled={isFollowing}
            onChange={(event) => change({ body: event.target.value as Body })}
          />
        </>
      }
      actions={
        <>
          <Button size="sm" disabled={isFollowing} onClick={() => onChange({ ...state, run: nextRun(state.run) })}>
            <PlayIcon aria-hidden weight="fill" className="size-4" />
            {text.launch}
          </Button>
          <Button size="sm" variant="secondary" disabled={isFollowing} onClick={() => change({})}>
            <ArrowCounterClockwiseIcon aria-hidden weight="bold" className="size-4" />
            {labs.common.reset}
          </Button>
        </>
      }
      visual={
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden className="block h-auto w-full">
          <line
            x1={0}
            x2={WIDTH}
            y1={HEIGHT - MARGIN}
            y2={HEIGHT - MARGIN}
            className="stroke-line"
            strokeWidth={2}
          />
          {state.height > 0 && (
            <rect
              x={MARGIN - 14}
              y={HEIGHT - MARGIN - state.height * scale}
              width={14}
              height={state.height * scale}
              className="fill-line"
            />
          )}
          <path d={path} fill="none" className="stroke-grape" strokeWidth={2} strokeDasharray="6 6" />
          <circle cx={ball.x} cy={ball.y} r={9} className="fill-coral" />
        </svg>
      }
      readings={[
        { label: text.flightTime, value: quantity(flight.time, labs.units.second) },
        { label: text.range, value: quantity(flight.range, labs.units.metre) },
        { label: text.maxHeight, value: quantity(flight.maxHeight, labs.units.metre) },
      ]}
    />
  );
}

/** A launch at a speed and an angle: its path, how far it lands and how high it goes. */
export const projectileLab: LabModule<ProjectileState> = {
  key: "projectile",
  initial: () => ({ speed: 20, angle: 45, height: 0, body: "earth", run: 0 }),
  parse(value) {
    const fields = isFields(value) ? value : {};
    return {
      speed: numberIn(fields.speed, 1, 50, 20),
      angle: numberIn(fields.angle, 0, 90, 45),
      height: numberIn(fields.height, 0, 50, 0),
      body: oneOf(fields.body, BODIES, "earth"),
      run: runOf(fields.run),
    };
  },
  View: ProjectileView,
};
