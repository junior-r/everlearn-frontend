import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        className={cn(
          "h-11 rounded-xl border border-line bg-surface px-3 text-sm text-foreground transition-colors hover:border-brand/50 placeholder:text-muted focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/25 focus-visible:outline-offset-0 focus-visible:outline-4",
          className,
        )}
      />
    </div>
  );
}
