import { useId } from "react";

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** The value as text, already formatted with its unit ("9,81 m/s²"). */
  display: string;
  disabled?: boolean;
  onChange(value: number): void;
}

/** A slider with its label and its current value written out, for quantities set by feel. */
export function RangeField({ label, value, min, max, step, display, disabled, onChange }: RangeFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm tabular-nums text-muted">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-brand disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
