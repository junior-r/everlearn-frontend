"use client";

import { useCallback, useState } from "react";
import {
  cellKey,
  cellsFromWindows,
  DAYS,
  fetchAvailability,
  formatTime,
  HOURS,
  windowsFromCells,
  type TimeRange,
} from "@/entities/schedule";
import { apiClient, forInstitution } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice } from "@/shared/ui";

interface AvailabilityEditorProps {
  institutionId: string;
  teacher: { membershipId: string; name: string };
  periodId: string;
}

/**
 * A weekly grid of hours. Clicking a cell toggles whether the teacher can
 * teach then; nothing is sent until "save", which replaces the whole week.
 */
export function AvailabilityEditor({ institutionId, teacher, periodId }: AvailabilityEditorProps) {
  const { admin, common, days, errors } = useDictionary();
  const text = admin.availability;
  const load = useCallback(
    () => fetchAvailability(institutionId, teacher.membershipId, periodId),
    [institutionId, teacher.membershipId, periodId],
  );
  const saved = useResource(load);
  // Null until the user changes something; until then the grid mirrors the server
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const save = useCallback(
    (windows: TimeRange[]) =>
      apiClient.request<TimeRange[]>(`/teachers/${teacher.membershipId}/availability`, {
        method: "PUT",
        body: { periodId, windows },
        headers: forInstitution(institutionId),
      }),
    [institutionId, teacher.membershipId, periodId],
  );
  const { submit, isSubmitting, error } = useSubmit(save);

  if (saved.data === null) {
    return saved.error ? (
      <ErrorNotice message={errorMessage(errors, saved.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }

  const cells = draft ?? cellsFromWindows(saved.data);

  function toggle(key: string) {
    const next = new Set(cells);
    if (!next.delete(key)) {
      next.add(key);
    }
    setDraft(next);
    setJustSaved(false);
  }

  async function handleSave() {
    if (await submit(windowsFromCells(cells))) {
      setJustSaved(true);
      setDraft(null);
      saved.reload();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{text.hint}</p>
      <ErrorNotice message={errorMessage(errors, error)} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-2 shadow-card">
        <table className="w-full border-collapse text-center text-xs">
          <caption className="sr-only">{format(text.caption, { name: teacher.name })}</caption>
          <thead className="text-muted">
            <tr>
              <th scope="col" className="px-2 py-2 font-medium">
                {text.hour}
              </th>
              {DAYS.map((day) => (
                <th key={day} scope="col" className="px-2 py-2 font-medium">
                  {days[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <th scope="row" className="px-2 py-1 font-mono font-medium text-muted">
                  {formatTime(hour * 60)}
                </th>
                {DAYS.map((day) => {
                  const key = cellKey(day, hour);
                  const isAvailable = cells.has(key);
                  return (
                    <td key={day} className="p-0.5">
                      <button
                        type="button"
                        aria-pressed={isAvailable}
                        aria-label={`${days[day]} ${formatTime(hour * 60)}, ${isAvailable ? text.available : text.unavailable}`}
                        onClick={() => toggle(key)}
                        className={cn(
                          "block h-8 w-full rounded-lg transition duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-brand",
                          isAvailable
                            ? "bg-mint shadow-sm shadow-mint/40 hover:brightness-95"
                            : "pattern-hatch bg-surface-muted hover:bg-mint-soft",
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {justSaved && (
        <p role="status" className="w-fit rounded-xl bg-mint-soft px-3 py-2 text-sm text-mint-ink">
          {text.saved}
        </p>
      )}
      <div className="max-w-xs">
        <Button isLoading={isSubmitting} disabled={draft === null} onClick={handleSave}>
          {text.save}
        </Button>
      </div>
    </div>
  );
}
