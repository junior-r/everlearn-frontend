import { cn } from "@/shared/lib/cn";

interface LogoProps {
  /** The product name, from the dictionary. */
  name: string;
  /** `inverse` is for the ink surface of the navigation and the brand panel. */
  variant?: "default" | "inverse";
}

/** The wordmark with its mark: a cobalt tile with a rising sun, the first tile of the mosaic. */
export function Logo({ name, variant = "default" }: LogoProps) {
  return (
    <p className="flex items-center gap-2.5">
      <span aria-hidden className="relative size-8 overflow-hidden rounded-[10px] bg-brand">
        <span className="absolute -right-1 -bottom-1 size-6 rounded-tl-full bg-sun" />
        <span className="absolute top-1.5 left-1.5 size-2 rounded-full bg-on-brand" />
      </span>
      <span
        className={cn(
          "font-display text-lg font-semibold tracking-tight",
          variant === "inverse" ? "text-on-ink" : "text-foreground",
        )}
      >
        {name}
      </span>
    </p>
  );
}
