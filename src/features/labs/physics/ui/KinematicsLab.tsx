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
import { meetingTime, positionAt, velocityAt, type Mover } from "../lib/physics";

export interface KinematicsState {
  movers: [Mover, Mover];
  run: number;
}

/** Every run lasts this long, in seconds: long enough to see an acceleration. */
const DURATION = 10;
const SAMPLES = 50;

const WIDTH = 480;
const TRACK = 70;
const CHART_TOP = 96;
const HEIGHT = 300;
const LEFT = 44;
const RIGHT = 16;
const BOTTOM = 26;
const TONES = ["fill-sky", "fill-coral"] as const;
const STROKES = ["stroke-sky", "stroke-coral"] as const;

const MOVER_LIMITS = {
  position: { min: -100, max: 100, step: 5 },
  velocity: { min: -20, max: 20, step: 1 },
  acceleration: { min: -5, max: 5, step: 0.5 },
} as const;

function KinematicsView({ state, onChange, mode }: LabViewProps<KinematicsState>) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.kinematics;
  const isFollowing = mode === "follower";
  const elapsed = usePlayback(state.run, DURATION);
  const time = state.run === 0 ? 0 : elapsed;
  const samples = state.movers.map((mover) =>
    Array.from({ length: SAMPLES + 1 }, (_, step) => positionAt(mover, (DURATION * step) / SAMPLES)),
  );
  const all = samples.flat();
  const low = Math.min(...all);
  const high = Math.max(...all);
  const span = Math.max(high - low, 1);
  const toX = (position: number) => LEFT + ((position - low) / span) * (WIDTH - LEFT - RIGHT);
  const chartHeight = HEIGHT - CHART_TOP - BOTTOM;
  const toChartY = (position: number) => CHART_TOP + chartHeight - ((position - low) / span) * chartHeight;
  const toChartX = (seconds: number) => LEFT + (seconds / DURATION) * (WIDTH - LEFT - RIGHT);
  const meeting = meetingTime(state.movers[0], state.movers[1], DURATION);
  const quantity = (value: number, unit: string, digits?: number) => formatQuantity(locale, value, unit, digits);
  const names = [text.first, text.second];
  const setMover = (index: 0 | 1, patch: Partial<Mover>) => {
    const movers: [Mover, Mover] = [...state.movers];
    movers[index] = { ...movers[index], ...patch };
    onChange({ movers, run: 0 });
  };

  return (
    <LabStage
      visualLabel={format(text.drawing, { seconds: String(DURATION) })}
      readingsLabel={labs.common.readings}
      controls={state.movers.map((mover, index) => (
        <fieldset key={index} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-semibold">{names[index]}</legend>
          <RangeField
            label={text.position}
            value={mover.position}
            {...MOVER_LIMITS.position}
            display={quantity(mover.position, labs.units.metre)}
            disabled={isFollowing}
            onChange={(position) => setMover(index as 0 | 1, { position })}
          />
          <RangeField
            label={text.velocity}
            value={mover.velocity}
            {...MOVER_LIMITS.velocity}
            display={quantity(mover.velocity, labs.units.speed)}
            disabled={isFollowing}
            onChange={(velocity) => setMover(index as 0 | 1, { velocity })}
          />
          <RangeField
            label={text.acceleration}
            value={mover.acceleration}
            {...MOVER_LIMITS.acceleration}
            display={quantity(mover.acceleration, labs.units.acceleration)}
            disabled={isFollowing}
            onChange={(acceleration) => setMover(index as 0 | 1, { acceleration })}
          />
        </fieldset>
      ))}
      actions={
        <>
          <Button size="sm" disabled={isFollowing} onClick={() => onChange({ ...state, run: state.run + 1 })}>
            <PlayIcon aria-hidden weight="fill" className="size-4" />
            {text.start}
          </Button>
          <Button size="sm" variant="secondary" disabled={isFollowing} onClick={() => onChange({ ...state, run: 0 })}>
            <ArrowCounterClockwiseIcon aria-hidden weight="bold" className="size-4" />
            {labs.common.reset}
          </Button>
        </>
      }
      visual={
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden className="block h-auto w-full">
          <rect x={LEFT} y={TRACK - 18} width={WIDTH - LEFT - RIGHT} height={36} rx={18} className="fill-surface" />
          {state.movers.map((mover, index) => (
            <g key={index}>
              <circle cx={toX(positionAt(mover, time))} cy={TRACK + (index === 0 ? -7 : 7)} r={8} className={TONES[index]} />
              <path
                d={samples[index]
                  .map((position, step) => `${step === 0 ? "M" : "L"}${toChartX((DURATION * step) / SAMPLES).toFixed(1)},${toChartY(position).toFixed(1)}`)
                  .join(" ")}
                fill="none"
                className={STROKES[index]}
                strokeWidth={2.5}
              />
            </g>
          ))}
          <line x1={LEFT} x2={LEFT} y1={CHART_TOP} y2={CHART_TOP + chartHeight} className="stroke-line" />
          <line
            x1={LEFT}
            x2={WIDTH - RIGHT}
            y1={CHART_TOP + chartHeight}
            y2={CHART_TOP + chartHeight}
            className="stroke-line"
          />
          <line
            x1={toChartX(time)}
            x2={toChartX(time)}
            y1={CHART_TOP}
            y2={CHART_TOP + chartHeight}
            className="stroke-muted"
            strokeDasharray="3 5"
          />
          {meeting !== null && (
            <circle
              cx={toChartX(meeting)}
              cy={toChartY(positionAt(state.movers[0], meeting))}
              r={5}
              className="fill-sun stroke-foreground"
            />
          )}
          <text x={LEFT} y={HEIGHT - 6} className="fill-muted font-mono text-[11px]">
            0 s
          </text>
          <text x={WIDTH - RIGHT} y={HEIGHT - 6} textAnchor="end" className="fill-muted font-mono text-[11px]">
            {DURATION} s
          </text>
          <text x={4} y={CHART_TOP + 10} className="fill-muted font-mono text-[11px]">
            {formatQuantity(locale, high, "m", 0)}
          </text>
          <text x={4} y={CHART_TOP + chartHeight} className="fill-muted font-mono text-[11px]">
            {formatQuantity(locale, low, "m", 0)}
          </text>
        </svg>
      }
      readings={[
        ...state.movers.flatMap((mover, index) => [
          {
            label: format(text.finalPosition, { mover: names[index], seconds: String(DURATION) }),
            value: quantity(positionAt(mover, DURATION), labs.units.metre),
          },
          {
            label: format(text.finalVelocity, { mover: names[index], seconds: String(DURATION) }),
            value: quantity(velocityAt(mover, DURATION), labs.units.speed),
          },
        ]),
        {
          label: text.meeting,
          value: meeting === null ? text.never : quantity(meeting, labs.units.second),
        },
      ]}
    />
  );
}

const parseMover = (value: unknown, fallback: Mover): Mover => {
  const fields = isFields(value) ? value : {};
  const { position, velocity, acceleration } = MOVER_LIMITS;
  return {
    position: numberIn(fields.position, position.min, position.max, fallback.position),
    velocity: numberIn(fields.velocity, velocity.min, velocity.max, fallback.velocity),
    acceleration: numberIn(fields.acceleration, acceleration.min, acceleration.max, fallback.acceleration),
  };
};

const STEADY: Mover = { position: 0, velocity: 8, acceleration: 0 };
const STARTING: Mover = { position: -20, velocity: 0, acceleration: 2 };

/** Two movers on one road, one steady and one speeding up: where each is, and when they meet. */
export const kinematicsLab: LabModule<KinematicsState> = {
  key: "kinematics",
  initial: () => ({ movers: [STEADY, STARTING], run: 0 }),
  parse(value) {
    const fields = isFields(value) ? value : {};
    const movers = Array.isArray(fields.movers) ? fields.movers : [];
    return { movers: [parseMover(movers[0], STEADY), parseMover(movers[1], STARTING)], run: runOf(fields.run) };
  },
  View: KinematicsView,
};
