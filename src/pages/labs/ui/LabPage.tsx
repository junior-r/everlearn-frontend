"use client";

import { ArrowLeftIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { useActiveInstitution } from "@/entities/institution";
import {
  decodeLabState,
  fetchAvailableLabs,
  isLabKey,
  isLanguageLab,
  type LabKey,
  type LabState,
} from "@/entities/lab";
import { ManageExercises } from "@/features/labs/manage-exercises";
import { errorMessage, localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Button, ErrorNotice, Section } from "@/shared/ui";
import { LAB_RUNNERS, LabView } from "@/widgets/lab-workbench";
import { PortalShell } from "@/widgets/portal-shell";

/** The lab itself, once known to be available; it starts from the state in the address when there is one. */
function OpenLab({ labKey, institutionId }: { labKey: LabKey; institutionId: string }) {
  const { labs, errors, common } = useDictionary();
  const { roles } = useActiveInstitution();
  const fromAddress = decodeLabState(useSearchParams()?.get("state") ?? null);
  const runner = LAB_RUNNERS[labKey];
  const [state, setState] = useState<LabState>(() => (fromAddress ? runner.parse(fromAddress) : runner.initial()));
  const load = useCallback(() => fetchAvailableLabs(institutionId), [institutionId]);
  const available = useResource(load);

  if (available.error) {
    return <ErrorNotice message={errorMessage(errors, available.error)} />;
  }
  if (!available.data) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  if (!available.data.some((lab) => lab.key === labKey)) {
    return <ErrorNotice message={labs.catalog.unavailable} />;
  }
  return (
    <>
      {fromAddress && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sky-soft px-4 py-3 text-sm text-sky-ink">
          <p className="flex-1">{labs.catalog.fromClass}</p>
          <Button size="sm" variant="secondary" onClick={() => setState(runner.initial())}>
            <ArrowsClockwiseIcon aria-hidden className="size-4" />
            {labs.catalog.startOver}
          </Button>
        </div>
      )}
      <LabView labKey={labKey} state={state} onChange={setState} mode="standalone" institutionId={institutionId} />
      {isLanguageLab(labKey) && roles.includes("TEACHER") && (
        <Section title={labs.exercises.title}>
          <ManageExercises institutionId={institutionId} labKey={labKey} />
        </Section>
      )}
    </>
  );
}

function Lab() {
  const param = useParams<{ labKey: string }>()?.labKey ?? null;
  const { labs } = useDictionary();
  const locale = useLocale();
  const labKey = isLabKey(param) ? param : null;
  return (
    <PortalShell
      title={labKey ? labs.names[labKey] : labs.catalog.title}
      subtitle={labKey ? labs.descriptions[labKey] : ""}
      roles={["TEACHER", "STUDENT"]}
    >
      {(institutionId) => (
        <>
          <Link
            href={localizedPath(locale, "/labs")}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
            {labs.catalog.back}
          </Link>
          {labKey ? (
            // Keyed by the lab, so moving between labs starts each from its own state
            <OpenLab key={labKey} labKey={labKey} institutionId={institutionId} />
          ) : (
            <ErrorNotice message={labs.catalog.unavailable} />
          )}
        </>
      )}
    </PortalShell>
  );
}

/** One lab, to play with. A Teacher of a language lab also writes their own exercises here. */
export function LabPage() {
  return (
    // useParams and useSearchParams need a Suspense boundary for the page shell to prerender
    <Suspense>
      <Lab />
    </Suspense>
  );
}
