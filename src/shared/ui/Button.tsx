import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** `md` fills its container (forms); `sm` hugs its label (tables and toolbars). */
  size?: Size;
  isLoading?: boolean;
}

export const buttonStyles: Record<Variant, string> = {
  primary: "bg-brand text-on-brand shadow-sm shadow-brand/30 hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-foreground hover:border-brand/50 hover:bg-brand-soft",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-surface",
};

const sizes: Record<Size, string> = {
  md: "h-11 w-full px-4",
  sm: "h-9 px-3",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";

/** For links and labels that should look like a full-width button. */
export const buttonBase = `${base} ${sizes.md}`;

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(base, sizes[size], buttonStyles[variant], className)}
    >
      {isLoading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
