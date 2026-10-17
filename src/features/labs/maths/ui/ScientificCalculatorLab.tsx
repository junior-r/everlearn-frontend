"use client";

import { BackspaceIcon } from "@phosphor-icons/react/dist/ssr";
import { useId, type ReactNode } from "react";
import { isFields, oneOf, textOf, type LabModule, type LabViewProps } from "@/entities/lab";
import { compile, type AngleUnit } from "@/shared/lib/expression";
import { useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { ChoiceGroup } from "@/shared/ui";
import { describeExpressionError } from "./expression-error";

export interface CalculatorEntry {
  expression: string;
  result: string;
}

export interface CalculatorState {
  expression: string;
  angle: AngleUnit;
  /** The latest calculations, newest first. */
  history: CalculatorEntry[];
}

const MAX_EXPRESSION_LENGTH = 200;
const MAX_HISTORY = 8;
const ANGLES = ["deg", "rad"] as const;

type KeyLook = "digit" | "operator" | "function" | "action";

interface Key {
  label: ReactNode;
  /** Name for assistive technology when the label is a symbol. */
  name?: string;
  insert?: string;
  look: KeyLook;
}

const KEYS: Key[] = [
  { label: "sin", insert: "sin(", look: "function" },
  { label: "cos", insert: "cos(", look: "function" },
  { label: "tan", insert: "tan(", look: "function" },
  { label: "(", insert: "(", look: "operator" },
  { label: ")", insert: ")", look: "operator" },
  { label: "ln", insert: "ln(", look: "function" },
  { label: "log", insert: "log(", look: "function" },
  { label: "√", insert: "√(", look: "function" },
  { label: "xʸ", name: "^", insert: "^", look: "operator" },
  { label: "x²", name: "^2", insert: "^2", look: "operator" },
  { label: "7", insert: "7", look: "digit" },
  { label: "8", insert: "8", look: "digit" },
  { label: "9", insert: "9", look: "digit" },
  { label: "÷", insert: "÷", look: "operator" },
  { label: "n!", name: "!", insert: "!", look: "operator" },
  { label: "4", insert: "4", look: "digit" },
  { label: "5", insert: "5", look: "digit" },
  { label: "6", insert: "6", look: "digit" },
  { label: "×", insert: "×", look: "operator" },
  { label: "π", insert: "π", look: "function" },
  { label: "1", insert: "1", look: "digit" },
  { label: "2", insert: "2", look: "digit" },
  { label: "3", insert: "3", look: "digit" },
  { label: "−", name: "-", insert: "-", look: "operator" },
  { label: "e", insert: "e", look: "function" },
  { label: "0", insert: "0", look: "digit" },
  { label: ",", insert: ",", look: "digit" },
  { label: "x⁻¹", name: "^-1", insert: "^-1", look: "operator" },
  { label: "+", insert: "+", look: "operator" },
  { label: "abs", insert: "abs(", look: "function" },
];

const keyLooks: Record<KeyLook, string> = {
  digit: "bg-surface text-foreground hover:bg-surface-muted",
  operator: "bg-brand-soft text-brand hover:bg-brand-soft/70",
  function: "bg-grape-soft text-grape-ink hover:bg-grape-soft/70",
  action: "bg-surface-muted text-foreground hover:bg-line",
};

/** A result for the reader's locale, with up to ten significant digits. */
function formatResult(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 10 }).format(value);
}

function CalculatorView({ state, onChange, mode }: LabViewProps<CalculatorState>) {
  const { labs } = useDictionary();
  const locale = useLocale();
  const text = labs.calculator;
  const inputId = useId();
  const isFollowing = mode === "follower";
  const compiled = compile(state.expression, []);
  const value = compiled.ok ? compiled.expression.evaluate({}, state.angle) : Number.NaN;
  const preview = compiled.ok ? (Number.isFinite(value) ? formatResult(locale, value) : text.undefined) : "";
  const insert = (piece: string) =>
    onChange({ ...state, expression: (state.expression + piece).slice(0, MAX_EXPRESSION_LENGTH) });

  function evaluate() {
    if (!compiled.ok || !Number.isFinite(value)) {
      return;
    }
    const result = formatResult(locale, value);
    onChange({
      ...state,
      // Without group separators, so the result can be typed on with
      expression: String(Number(value.toPrecision(12))).replace(".", ","),
      history: [{ expression: state.expression, result }, ...state.history].slice(0, MAX_HISTORY),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            evaluate();
          }}
          className="flex flex-col gap-1 rounded-xl bg-ink p-4 text-on-ink"
        >
          <label htmlFor={inputId} className="sr-only">
            {text.expression}
          </label>
          <input
            id={inputId}
            value={state.expression}
            readOnly={isFollowing}
            maxLength={MAX_EXPRESSION_LENGTH}
            spellCheck={false}
            autoComplete="off"
            inputMode="text"
            placeholder="0"
            onChange={(event) => onChange({ ...state, expression: event.target.value })}
            className="w-full bg-transparent text-right font-mono text-lg text-on-ink outline-none placeholder:text-on-ink/40"
          />
          <output htmlFor={inputId} aria-live="polite" className="min-h-9 text-right font-mono text-2xl font-semibold tabular-nums">
            {preview && `= ${preview}`}
          </output>
          {!compiled.ok && state.expression.trim() !== "" && (
            <p className="text-right text-xs text-sun">{describeExpressionError(labs.expressionErrors, compiled.error)}</p>
          )}
        </form>
        <ChoiceGroup
          label={text.angle}
          value={state.angle}
          options={ANGLES.map((angle) => ({ value: angle, label: text.angles[angle] }))}
          disabled={isFollowing}
          onChange={(angle) => onChange({ ...state, angle })}
        />
        <div role="group" aria-label={text.keypad} className="grid grid-cols-5 gap-1.5">
          {KEYS.map((key) => (
            <button
              key={`${key.insert}-${key.name ?? ""}`}
              type="button"
              aria-label={key.name}
              disabled={isFollowing}
              onClick={() => key.insert && insert(key.insert)}
              className={cn(
                "h-11 rounded-xl font-mono text-sm font-semibold transition duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60",
                keyLooks[key.look],
              )}
            >
              {key.label}
            </button>
          ))}
          <button
            type="button"
            disabled={isFollowing}
            onClick={() => onChange({ ...state, expression: "" })}
            className={cn("col-span-2 h-11 rounded-xl text-sm font-semibold disabled:opacity-60", keyLooks.action)}
          >
            {text.clear}
          </button>
          <button
            type="button"
            aria-label={text.backspace}
            disabled={isFollowing}
            onClick={() => onChange({ ...state, expression: state.expression.slice(0, -1) })}
            className={cn("grid h-11 place-items-center rounded-xl disabled:opacity-60", keyLooks.action)}
          >
            <BackspaceIcon aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            disabled={isFollowing || !compiled.ok || !Number.isFinite(value)}
            onClick={evaluate}
            className="col-span-2 h-11 rounded-xl bg-brand font-mono text-lg font-semibold text-on-brand transition hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
          >
            =
          </button>
        </div>
      </div>
      <section aria-label={text.history} className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-semibold">{text.history}</h3>
        {state.history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">{text.noHistory}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {state.history.map((entry, index) => (
              <li key={`${index}-${entry.expression}`} className="rounded-xl border border-line bg-surface px-3 py-2">
                <p className="truncate font-mono text-xs text-muted">{entry.expression}</p>
                <p className="font-mono text-base font-semibold tabular-nums">= {entry.result}</p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-muted">{text.help}</p>
      </section>
    </div>
  );
}

/** A scientific calculator with degrees or radians and the latest results. */
export const scientificCalculatorLab: LabModule<CalculatorState> = {
  key: "scientific-calculator",
  initial: () => ({ expression: "", angle: "deg", history: [] }),
  parse(value) {
    const fields = isFields(value) ? value : {};
    const history = (Array.isArray(fields.history) ? fields.history : [])
      .slice(0, MAX_HISTORY)
      .filter(isFields)
      .map((entry) => ({
        expression: textOf(entry.expression, MAX_EXPRESSION_LENGTH),
        result: textOf(entry.result, 40),
      }));
    return {
      expression: textOf(fields.expression, MAX_EXPRESSION_LENGTH),
      angle: oneOf(fields.angle, ANGLES, "deg"),
      history,
    };
  },
  View: CalculatorView,
};
