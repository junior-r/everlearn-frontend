import {
  AppleLogoIcon,
  ArrowsOutCardinalIcon,
  BookOpenTextIcon,
  CalculatorIcon,
  ChartLineIcon,
  FunctionIcon,
  GaugeIcon,
  TextAaIcon,
  RocketLaunchIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/shared/lib/cn";
import { toneSoft } from "@/shared/lib/tone";
import { categoryTone, type LabCategory, type LabKey } from "../model/types";

const ICONS: Record<LabKey, Icon> = {
  gravity: AppleLogoIcon,
  forces: ArrowsOutCardinalIcon,
  kinematics: GaugeIcon,
  projectile: RocketLaunchIcon,
  "function-grapher": ChartLineIcon,
  "scientific-calculator": CalculatorIcon,
  "equation-solver": FunctionIcon,
  completions: TextAaIcon,
  definitions: BookOpenTextIcon,
};

/** The lab's glyph on a tile in its category's colour. Decorative: the lab's name always goes beside it. */
export function LabIcon({ labKey, category, size = "md" }: { labKey: LabKey; category: LabCategory; size?: "sm" | "md" }) {
  const Glyph = ICONS[labKey];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center",
        size === "md" ? "size-12 rounded-2xl" : "size-9 rounded-xl",
        toneSoft[categoryTone[category]],
      )}
    >
      <Glyph weight="duotone" className={size === "md" ? "size-6" : "size-5"} />
    </span>
  );
}
