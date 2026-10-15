"use client";

import { ArrowCounterClockwiseIcon, PlayIcon } from "@phosphor-icons/react/dist/ssr";
import {
  formatQuantity,
  isFields,
  LabStage,
  numberIn,
  oneOf,
  runOf,
  type LabModule,
  type LabViewProps,
} from "@/entities/lab";
import { format, useDictionary, useLocale } from "@/shared/i18n";
import { usePlayback } from "@/shared/lib/use-playback";
import { Button, RangeField, SelectField } from "@/shared/ui";
import { BODIES, fallTime, GRAVITY, heightAt, impactSpeed, type Body } from "../lib/physics";

export interface GravityState {
  height: number;
  bodies: [Body, Body];
  /** How many times the objects were dropped; each change plays the fall again. */
  run: number;
}

const MIN_HEIGHT = 1;
const MAX_HEIGHT = 100;

const WIDTH = 480;
const HEIGHT = 300;
const GROUND = 270;
const TOP = 30;
const RADIUS = 11;

function GravityView({ state, onChange, mode }: LabViewProps<GravityState>) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.gravity;
  const isFollowing = mode === "follower";
  const times = state.bodies.map((body) => fallTime(state.height, GRAVITY[body]));
  const elapsed = usePlayback(state.run, Math.max(...times));
  const scale = (GROUND - TOP) / state.height;
  const quantity = (value: number, unit: string, digits?: number) => formatQuantity(locale, value, unit, digits);
  const setBody = (index: 0 | 1, body: Body) => {
    const bodies: [Body, Body] = [...state.bodies];
    bodies[index] = body;
    onChange({ ...state, bodies, run: 0 });
  };
  const bodyOptions = BODIES.map((body) => ({
    value: body,
    label: `${labs.bodies[body]} (${quantity(GRAVITY[body], labs.units.acceleration)})`,
  }));

  return (
    <LabStage
      visualLabel={format(text.drawing, {
        height: quantity(state.height, labs.units.metre),
        first: labs.bodies[state.bodies[0]],
        second: labs.bodies[state.bodies[1]],
      })}
      readingsLabel={labs.common.readings}
      controls={
        <>
          <RangeField
            label={text.height}
            value={state.height}
            min={MIN_HEIGHT}
            max={MAX_HEIGHT}
            step={1}
            display={quantity(state.height, labs.units.metre)}
            disabled={isFollowing}
            onChange={(height) => onChange({ ...state, height, run: 0 })}
          />
          <SelectField
            label={text.first}
            value={state.bodies[0]}
            options={bodyOptions}
            disabled={isFollowing}
            onChange={(event) => setBody(0, event.target.value as Body)}
          />
          <SelectField
            label={text.second}
            value={state.bodies[1]}
            options={bodyOptions}
            disabled={isFollowing}
            onChange={(event) => setBody(1, event.target.value as Body)}
          />
        </>
      }
      actions={
        <>
          <Button size="sm" disabled={isFollowing} onClick={() => onChange({ ...state, run: state.run + 1 })}>
            <PlayIcon aria-hidden weight="fill" className="size-4" />
            {text.drop}
          </Button>
          <Button size="sm" variant="secondary" disabled={isFollowing} onClick={() => onChange({ ...state, run: 0 })}>
            <ArrowCounterClockwiseIcon aria-hidden weight="bold" className="size-4" />
            {labs.common.reset}
          </Button>
        </>
      }
      visual={
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden className="block h-auto w-full">
          <line x1={0} x2={WIDTH} y1={GROUND} y2={GROUND} className="stroke-line" strokeWidth={2} />
          <line x1={WIDTH / 2} x2={WIDTH / 2} y1={TOP - 10} y2={GROUND} className="stroke-line" strokeDasharray="4 6" />
          {[0, 0.25, 0.5, 0.75, 1].map((share) => {
            const y = GROUND - share * (GROUND - TOP);
            return (
              <g key={share}>
                <line x1={8} x2={20} y1={y} y2={y} className="stroke-muted" />
                <text x={24} y={y + 4} className="fill-muted font-mono text-[11px]">
                  {formatQuantity(locale, share * state.height, "m", 0)}
                </text>
              </g>
            );
          })}
          {state.bodies.map((body, index) => {
            const x = WIDTH / 4 + (index * WIDTH) / 2 + 20;
            const y = GROUND - heightAt(state.height, GRAVITY[body], elapsed) * scale - RADIUS;
            return (
              <g key={index}>
                <text x={x} y={GROUND + 22} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
                  {labs.bodies[body]}
                </text>
                <circle cx={x} cy={y} r={RADIUS} className={index === 0 ? "fill-sky" : "fill-coral"} />
              </g>
            );
          })}
        </svg>
      }
      readings={state.bodies.flatMap((body, index) => [
        {
          label: format(text.time, { body: labs.bodies[body] }),
          value: quantity(times[index], labs.units.second),
        },
        {
          label: format(text.speed, { body: labs.bodies[body] }),
          value: quantity(impactSpeed(state.height, GRAVITY[body]), labs.units.speed),
        },
      ])}
    />
  );
}

/** Free fall: the same object dropped from the same height on two worlds, side by side. */
export const gravityLab: LabModule<GravityState> = {
  key: "gravity",
  initial: () => ({ height: 20, bodies: ["earth", "moon"], run: 0 }),
  parse(value) {
    const fields = isFields(value) ? value : {};
    const bodies = Array.isArray(fields.bodies) ? fields.bodies : [];
    return {
      height: numberIn(fields.height, MIN_HEIGHT, MAX_HEIGHT, 20),
      bodies: [oneOf(bodies[0], BODIES, "earth"), oneOf(bodies[1], BODIES, "moon")],
      run: runOf(fields.run),
    };
  },
  View: GravityView,
};
