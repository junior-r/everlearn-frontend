"use client";

import { ArrowsInIcon, ArrowsOutIcon, CrosshairIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useId } from "react";
import {
  formatQuantity,
  isFields,
  numberIn,
  Readings,
  textOf,
  type LabModule,
  type LabViewProps,
} from "@/entities/lab";
import { compile } from "@/shared/lib/expression";
import { format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button, RangeField } from "@/shared/ui";
import { samplePlot, ticks, zoom, type Viewport } from "../lib/plot";
import { describeExpressionError } from "./expression-error";

export interface GrapherState {
  functions: string[];
  view: Viewport;
  /** Where the functions are read off. */
  probe: number;
}

const MAX_FUNCTIONS = 3;
const MAX_EXPRESSION_LENGTH = 120;
const LIMIT = 1e6;
const HOME: Viewport = { xMin: -10, xMax: 10, yMin: -7, yMax: 7 };

const WIDTH = 480;
const HEIGHT = 340;
const STROKES = ["stroke-brand", "stroke-coral", "stroke-mint"] as const;
const SWATCHES = ["bg-brand", "bg-coral", "bg-mint"] as const;

function GrapherView({ state, onChange, mode }: LabViewProps<GrapherState>) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.grapher;
  const fieldId = useId();
  const isFollowing = mode === "follower";
  const { view } = state;
  const toX = (x: number) => ((x - view.xMin) / (view.xMax - view.xMin)) * WIDTH;
  const toY = (y: number) => HEIGHT - ((y - view.yMin) / (view.yMax - view.yMin)) * HEIGHT;
  const compiled = state.functions.map((source) => compile(source, ["x"]));
  const setFunction = (index: number, source: string) =>
    onChange({ ...state, functions: state.functions.map((current, at) => (at === index ? source : current)) });
  const removeFunction = (index: number) =>
    onChange({ ...state, functions: state.functions.filter((_, at) => at !== index) });
  const number = (value: number) => formatQuantity(locale, value, "", 3);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">{text.functions}</legend>
          {state.functions.map((source, index) => {
            const result = compiled[index];
            const errorId = `${fieldId}-error-${index}`;
            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span aria-hidden className={cn("h-8 w-1.5 shrink-0 rounded-full", SWATCHES[index])} />
                  <label htmlFor={`${fieldId}-${index}`} className="shrink-0 font-mono text-sm">
                    {format(text.name, { number: String(index + 1) })}
                  </label>
                  <input
                    id={`${fieldId}-${index}`}
                    value={source}
                    maxLength={MAX_EXPRESSION_LENGTH}
                    readOnly={isFollowing}
                    spellCheck={false}
                    autoComplete="off"
                    aria-invalid={!result.ok && source.trim() !== ""}
                    aria-describedby={!result.ok ? errorId : undefined}
                    onChange={(event) => setFunction(index, event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 font-mono text-sm focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
                  />
                  {!isFollowing && state.functions.length > 1 && (
                    <button
                      type="button"
                      aria-label={format(text.remove, { number: String(index + 1) })}
                      onClick={() => removeFunction(index)}
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <TrashIcon aria-hidden className="size-4" />
                    </button>
                  )}
                </div>
                {!result.ok && source.trim() !== "" && (
                  <p id={errorId} className="pl-3.5 text-xs text-danger">
                    {describeExpressionError(labs.expressionErrors, result.error)}
                  </p>
                )}
              </div>
            );
          })}
          {!isFollowing && state.functions.length < MAX_FUNCTIONS && (
            <Button size="sm" variant="secondary" onClick={() => onChange({ ...state, functions: [...state.functions, ""] })}>
              <PlusIcon aria-hidden weight="bold" className="size-4" />
              {text.add}
            </Button>
          )}
        </fieldset>
        <p className="text-xs text-muted">{text.help}</p>
        <RangeField
          label={text.probe}
          value={state.probe}
          min={view.xMin}
          max={view.xMax}
          step={(view.xMax - view.xMin) / 200}
          display={`x = ${number(state.probe)}`}
          disabled={isFollowing}
          onChange={(probe) => onChange({ ...state, probe })}
        />
        <div className="mt-auto flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={isFollowing} onClick={() => onChange({ ...state, view: zoom(view, 0.5) })}>
            <ArrowsInIcon aria-hidden className="size-4" />
            {text.zoomIn}
          </Button>
          <Button size="sm" variant="secondary" disabled={isFollowing} onClick={() => onChange({ ...state, view: zoom(view, 2) })}>
            <ArrowsOutIcon aria-hidden className="size-4" />
            {text.zoomOut}
          </Button>
          <Button size="sm" variant="secondary" disabled={isFollowing} onClick={() => onChange({ ...state, view: HOME, probe: 0 })}>
            <CrosshairIcon aria-hidden className="size-4" />
            {text.home}
          </Button>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <figure aria-label={text.drawing} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden className="block h-auto w-full">
            {ticks(view.xMin, view.xMax).map((x) => (
              <g key={`x${x}`}>
                <line x1={toX(x)} x2={toX(x)} y1={0} y2={HEIGHT} className="stroke-surface-muted" />
                <text x={toX(x) + 3} y={Math.min(Math.max(toY(0) + 13, 13), HEIGHT - 4)} className="fill-muted font-mono text-[10px]">
                  {x !== 0 && number(x)}
                </text>
              </g>
            ))}
            {ticks(view.yMin, view.yMax, 6).map((y) => (
              <g key={`y${y}`}>
                <line x1={0} x2={WIDTH} y1={toY(y)} y2={toY(y)} className="stroke-surface-muted" />
                <text x={Math.min(Math.max(toX(0) + 4, 4), WIDTH - 30)} y={toY(y) - 3} className="fill-muted font-mono text-[10px]">
                  {y !== 0 && number(y)}
                </text>
              </g>
            ))}
            <line x1={toX(0)} x2={toX(0)} y1={0} y2={HEIGHT} className="stroke-muted" />
            <line x1={0} x2={WIDTH} y1={toY(0)} y2={toY(0)} className="stroke-muted" />
            <line
              x1={toX(state.probe)}
              x2={toX(state.probe)}
              y1={0}
              y2={HEIGHT}
              className="stroke-sun"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            {compiled.map((result, index) => {
              if (!result.ok) {
                return null;
              }
              const runs = samplePlot((x) => result.expression.evaluate({ x }), view);
              const y = result.expression.evaluate({ x: state.probe });
              return (
                <g key={index}>
                  {runs.map((run, runIndex) => (
                    <polyline
                      key={runIndex}
                      fill="none"
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      className={STROKES[index]}
                      points={run
                        .map((point) => `${toX(point.x).toFixed(1)},${toY(Math.max(-LIMIT, Math.min(LIMIT, point.y))).toFixed(1)}`)
                        .join(" ")}
                    />
                  ))}
                  {Number.isFinite(y) && y >= view.yMin && y <= view.yMax && (
                    <circle cx={toX(state.probe)} cy={toY(y)} r={5} className={cn("fill-surface", STROKES[index])} strokeWidth={2.5} />
                  )}
                </g>
              );
            })}
          </svg>
        </figure>
        <Readings
          label={labs.common.readings}
          readings={state.functions.map((source, index) => {
            const result = compiled[index];
            const y = result.ok ? result.expression.evaluate({ x: state.probe }) : Number.NaN;
            return {
              label: format(text.valueAt, { number: String(index + 1), x: number(state.probe) }),
              value: number(y),
            };
          })}
        />
      </div>
    </div>
  );
}

function parseView(value: unknown): Viewport {
  const fields = isFields(value) ? value : {};
  const view = {
    xMin: numberIn(fields.xMin, -LIMIT, LIMIT, HOME.xMin),
    xMax: numberIn(fields.xMax, -LIMIT, LIMIT, HOME.xMax),
    yMin: numberIn(fields.yMin, -LIMIT, LIMIT, HOME.yMin),
    yMax: numberIn(fields.yMax, -LIMIT, LIMIT, HOME.yMax),
  };
  return view.xMax > view.xMin && view.yMax > view.yMin ? view : HOME;
}

/** Up to three functions of x drawn on one grid, read off at any x. */
export const functionGrapherLab: LabModule<GrapherState> = {
  key: "function-grapher",
  initial: () => ({ functions: ["x^2 - 4", "2 sin(x)"], view: HOME, probe: 1 }),
  parse(value) {
    const fields = isFields(value) ? value : {};
    const functions = (Array.isArray(fields.functions) ? fields.functions : [])
      .slice(0, MAX_FUNCTIONS)
      .map((source) => textOf(source, MAX_EXPRESSION_LENGTH));
    const view = parseView(fields.view);
    return {
      functions: functions.length > 0 ? functions : ["x"],
      view,
      probe: numberIn(fields.probe, view.xMin, view.xMax, (view.xMin + view.xMax) / 2),
    };
  },
  View: GrapherView,
};
