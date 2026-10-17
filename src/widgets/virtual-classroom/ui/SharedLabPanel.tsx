"use client";

import { ArrowSquareOutIcon, StopCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { categoryOf, encodeLabState, LabIcon, labPath, type LabKey, type LabState } from "@/entities/lab";
import { localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { buttonClass, Badge, Button } from "@/shared/ui";

interface SharedLabPanelProps {
  labKey: LabKey;
  state: LabState;
  mode: "presenter" | "follower";
  onStop(): void;
  children: ReactNode;
}

/**
 * The lab on the class's stage: drawn here from its shared state, sharp at any
 * size. The Teacher drives it and can take it off; a Student follows it and can
 * open the same lab, as it stands, in their own labs.
 */
export function SharedLabPanel({ labKey, state, mode, onStop, children }: SharedLabPanelProps) {
  const { classroom, labs } = useDictionary();
  const locale = useLocale();
  const text = classroom.lab;
  const ownCopy = `${localizedPath(locale, labPath(labKey))}?state=${encodeLabState(state)}`;
  return (
    <section
      aria-label={labs.names[labKey]}
      className="flex min-h-80 flex-1 flex-col overflow-hidden rounded-2xl bg-background text-foreground lg:min-h-0"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <LabIcon labKey={labKey} category={categoryOf(labKey)} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{labs.names[labKey]}</h2>
          <Badge tone={mode === "presenter" ? "sky" : "mint"}>
            {mode === "presenter" ? text.youShare : text.teacherShares}
          </Badge>
        </div>
        {mode === "presenter" ? (
          <Button size="sm" variant="danger" onClick={onStop}>
            <StopCircleIcon aria-hidden weight="fill" className="size-4" />
            {text.stop}
          </Button>
        ) : (
          <a href={ownCopy} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
            <ArrowSquareOutIcon aria-hidden className="size-4" />
            {text.openOwn}
          </a>
        )}
      </header>
      <div className="flex-1 overflow-auto p-3 sm:p-4">{children}</div>
    </section>
  );
}
