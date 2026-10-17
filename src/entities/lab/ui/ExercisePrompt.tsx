import { BLANK } from "../model/types";
import { cn } from "@/shared/lib/cn";

/** An exercise's prompt, with the blank of a completion drawn as a gap to fill (or filled, once revealed). */
export function ExercisePrompt({ prompt, filled, size = "md" }: { prompt: string; filled?: string; size?: "md" | "lg" }) {
  const [before, after] = prompt.split(BLANK);
  return (
    <p className={cn("leading-relaxed text-pretty", size === "lg" ? "text-2xl font-medium sm:text-3xl" : "text-lg")}>
      {before}
      {after !== undefined && (
        <>
          <span
            className={cn(
              "mx-1 inline-block min-w-16 border-b-2 px-1 text-center",
              filled ? "border-mint font-semibold text-mint-ink" : "border-brand text-transparent",
            )}
          >
            {filled ?? BLANK}
          </span>
          {after}
        </>
      )}
    </p>
  );
}
