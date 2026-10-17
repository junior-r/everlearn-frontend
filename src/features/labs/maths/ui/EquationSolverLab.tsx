"use client";

import { useId, useMemo } from "react";
import { isFields, Readings, textOf, type LabModule, type LabViewProps } from "@/entities/lab";
import { format, useDictionary, useLocale } from "@/shared/i18n";
import { SelectField, TextField } from "@/shared/ui";
import { parseEquation, solveFor } from "../lib/solve";
import { describeExpressionError } from "./expression-error";

export interface SolverState {
  equation: string;
  /** The variable to find. */
  unknown: string;
  /** What each known variable is worth, as typed. */
  values: Record<string, string>;
}

const MAX_EQUATION_LENGTH = 120;
const MAX_VALUE_LENGTH = 24;

/** Formulas to start from; the names are the dictionary keys of their description. */
export const PRESETS = {
  speed: "v = d / t",
  force: "F = m a",
  energy: "E = m g h",
  circle: "A = pi r^2",
  pythagoras: "c^2 = a^2 + b^2",
  ohm: "V = I R",
} as const;
type Preset = keyof typeof PRESETS;
const CUSTOM = "custom";

/** A number as typed, with a decimal comma or point; null when it is not one. */
function typedNumber(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) ? value : null;
}

function SolverView({ state, onChange, mode }: LabViewProps<SolverState>) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.solver;
  const equationId = useId();
  const isFollowing = mode === "follower";
  const parsed = useMemo(() => parseEquation(state.equation), [state.equation]);
  const variables = parsed.ok ? parsed.equation.variables : [];
  const unknown = variables.includes(state.unknown) ? state.unknown : (variables[0] ?? "");
  const known = variables.filter((name) => name !== unknown);
  const values = Object.fromEntries(known.map((name) => [name, typedNumber(state.values[name] ?? "")]));
  const missing = known.filter((name) => values[name] === null);
  const solutions =
    parsed.ok && unknown && missing.length === 0
      ? solveFor(parsed.equation, unknown, values as Record<string, number>)
      : null;
  const preset = (Object.keys(PRESETS) as Preset[]).find((key) => PRESETS[key] === state.equation) ?? CUSTOM;
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumSignificantDigits: 8 }).format(value);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <SelectField
          label={text.preset}
          value={preset}
          disabled={isFollowing}
          options={[
            ...(Object.keys(PRESETS) as Preset[]).map((key) => ({ value: key, label: `${text.presets[key]}: ${PRESETS[key]}` })),
            { value: CUSTOM, label: text.custom },
          ]}
          onChange={(event) => {
            const key = event.target.value as Preset | typeof CUSTOM;
            onChange({ ...state, equation: key === CUSTOM ? "" : PRESETS[key], unknown: "", values: {} });
          }}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={equationId} className="text-sm font-medium">
            {text.equation}
          </label>
          <input
            id={equationId}
            value={state.equation}
            maxLength={MAX_EQUATION_LENGTH}
            readOnly={isFollowing}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onChange({ ...state, equation: event.target.value })}
            className="h-11 rounded-xl border border-line bg-surface px-3 font-mono text-sm focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
          />
          {!parsed.ok && state.equation.trim() !== "" && (
            <p className="text-xs text-danger">{describeExpressionError(labs.expressionErrors, parsed.error)}</p>
          )}
          <p className="text-xs text-muted">{text.help}</p>
        </div>
        {variables.length > 0 && (
          <SelectField
            label={text.unknown}
            value={unknown}
            disabled={isFollowing}
            options={variables.map((name) => ({ value: name, label: name }))}
            onChange={(event) => onChange({ ...state, unknown: event.target.value })}
          />
        )}
        {known.map((name) => (
          <TextField
            key={name}
            label={format(text.valueOf, { name })}
            value={state.values[name] ?? ""}
            inputMode="decimal"
            maxLength={MAX_VALUE_LENGTH}
            readOnly={isFollowing}
            className="font-mono"
            onChange={(event) => onChange({ ...state, values: { ...state.values, [name]: event.target.value } })}
          />
        ))}
      </div>
      <section aria-label={text.result} className="flex min-w-0 flex-col gap-3">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <p className="text-sm text-muted">{text.result}</p>
          <p role="status" className="mt-1 font-mono text-2xl font-semibold">
            {!parsed.ok || !unknown
              ? text.waiting
              : missing.length > 0
                ? format(text.missing, { names: missing.join(", ") })
                : solutions && solutions.length > 0
                  ? solutions.map((solution) => `${unknown} = ${number(solution)}`).join("   ")
                  : text.noSolution}
          </p>
        </div>
        {parsed.ok && known.length > 0 && (
          <Readings
            label={text.knownValues}
            readings={known.map((name) => ({
              label: name,
              value: values[name] === null ? "-" : number(values[name] as number),
            }))}
          />
        )}
      </section>
    </div>
  );
}

/** Any formula solved for any of its variables: v = d / t gives t from v and d as well. */
export const equationSolverLab: LabModule<SolverState> = {
  key: "equation-solver",
  initial: () => ({ equation: PRESETS.speed, unknown: "v", values: { d: "100", t: "9,58" } }),
  parse(value) {
    const fields = isFields(value) ? value : {};
    const values = isFields(fields.values)
      ? Object.fromEntries(
          Object.entries(fields.values)
            .slice(0, 12)
            .map(([name, typed]) => [name.slice(0, 24), textOf(typed, MAX_VALUE_LENGTH)]),
        )
      : {};
    return {
      equation: textOf(fields.equation, MAX_EQUATION_LENGTH, PRESETS.speed),
      unknown: textOf(fields.unknown, 24),
      values,
    };
  },
  View: SolverView,
};
