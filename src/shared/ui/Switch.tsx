import { cn } from "@/shared/lib/cn";

interface SwitchProps {
  /** Says what the switch turns on, for those who cannot see where it sits. */
  label: string;
  checked: boolean;
  disabled?: boolean;
  isBusy?: boolean;
  onChange(checked: boolean): void;
}

/** An on/off control that acts at once, unlike a checkbox in a form. */
export function Switch({ label, checked, disabled, isBusy, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={isBusy}
      disabled={disabled || isBusy}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-line",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-5 rounded-full bg-surface shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
