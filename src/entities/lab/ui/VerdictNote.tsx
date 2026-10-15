import { CheckCircleIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { Verdict } from "../model/types";
import { useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { toneSoft, type Tone } from "@/shared/lib/tone";

const LOOK: Record<Verdict, { tone: Tone; icon: typeof CheckCircleIcon }> = {
  CORRECT: { tone: "mint", icon: CheckCircleIcon },
  ACCENTS: { tone: "sun", icon: WarningCircleIcon },
  INCORRECT: { tone: "coral", icon: XCircleIcon },
};

/** What the backend made of an answer, in words and colour. */
export function VerdictNote({ verdict, className }: { verdict: Verdict; className?: string }) {
  const { labs } = useDictionary();
  const { tone, icon: VerdictIcon } = LOOK[verdict];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", toneSoft[tone], className)}>
      <VerdictIcon aria-hidden weight="fill" className="size-4" />
      {labs.verdicts[verdict]}
    </span>
  );
}
