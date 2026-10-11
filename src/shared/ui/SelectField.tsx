import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({ label, options, className, id, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        {...props}
        id={selectId}
        className={cn(
          "h-11 rounded-xl border border-line bg-surface px-3 text-sm text-foreground transition-colors hover:border-brand/50 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/25 focus-visible:outline-offset-0 focus-visible:outline-4",
          className,
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
