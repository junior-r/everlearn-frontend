"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useCallback } from "react";
import { fetchAvailableLabs, LAB_CATEGORIES, LabIcon, labPath } from "@/entities/lab";
import { errorMessage, localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice } from "@/shared/ui";

/** The labs the member may open, by category; one card each. */
export function LabCatalog({ institutionId }: { institutionId: string }) {
  const { labs, errors } = useDictionary();
  const locale = useLocale();
  const load = useCallback(() => fetchAvailableLabs(institutionId), [institutionId]);
  const available = useResource(load);

  if (available.error) {
    return <ErrorNotice message={errorMessage(errors, available.error)} />;
  }
  if (!available.data) {
    return (
      <div aria-hidden className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
        ))}
      </div>
    );
  }
  if (available.data.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{labs.catalog.none}</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {LAB_CATEGORIES.map((category) => {
        const inCategory = available.data?.filter((lab) => lab.category === category) ?? [];
        if (inCategory.length === 0) {
          return null;
        }
        return (
          <section key={category} aria-labelledby={`labs-${category}`} className="flex flex-col gap-3">
            <div>
              <h2 id={`labs-${category}`} className="text-lg font-semibold">
                {labs.categories[category]}
              </h2>
              <p className="text-sm text-muted">{labs.categoryDescriptions[category]}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inCategory.map((lab) => (
                <li key={lab.key}>
                  <Link
                    href={localizedPath(locale, labPath(lab.key))}
                    className="group flex h-full items-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition duration-150 hover:-translate-y-px hover:border-brand/60 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <LabIcon labKey={lab.key} category={lab.category} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-semibold">{labs.names[lab.key]}</span>
                      <span className="text-sm text-muted">{labs.descriptions[lab.key]}</span>
                    </span>
                    <ArrowRightIcon
                      aria-hidden
                      weight="bold"
                      className="mt-1 size-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
