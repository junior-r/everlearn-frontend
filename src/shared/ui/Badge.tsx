import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { toneFor, toneSoft, type Tone } from "@/shared/lib/tone";

export type BadgeTone = Tone | "neutral";

/** A small coloured label for a category or state (a role, a status). */
export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "neutral" ? "bg-surface-muted text-muted" : toneSoft[tone],
      )}
    >
      {children}
    </span>
  );
}

interface AvatarProps {
  /** The person's full name: gives the initials and a colour that is always the same for them. */
  name: string;
  size?: "sm" | "md";
}

/** Initials on a coloured disc. Decorative: the name is always shown next to it. */
export function Avatar({ name, size = "sm" }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold",
        size === "sm" ? "size-8 text-xs" : "size-11 text-sm",
        toneSoft[toneFor(name)],
      )}
    >
      {initials}
    </span>
  );
}
