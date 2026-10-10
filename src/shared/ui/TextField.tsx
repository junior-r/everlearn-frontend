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
          "h-11 rounded-lg border border-line bg-surface px-3 text-sm text-foreground placeholder:text-muted focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30",
          className,
        )}
      />
    </div>
  );
}
