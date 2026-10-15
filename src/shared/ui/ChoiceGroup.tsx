import { useId } from "react";
import { cn } from "@/shared/lib/cn";

interface ChoiceGroupProps<Value extends string> {
  label: string;
  value: Value;
  options: Array<{ value: Value; label: string }>;
  disabled?: boolean;
  onChange(value: Value): void;
}

/** A small set of exclusive choices shown side by side: radio buttons styled as a segmented control. */
export function ChoiceGroup<Value extends string>({ label, value, options, disabled, onChange }: ChoiceGroupProps<Value>) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
        {options.map((option) => {
          const isChosen = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand has-[:disabled]:cursor-not-allowed",
                isChosen ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isChosen}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
