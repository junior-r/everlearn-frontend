"use client";

import { useCallback, useState } from "react";
import {
  fetchLabGrants,
  fetchLabSettings,
  LAB_CATEGORIES,
  LabIcon,
  setLabEnabled,
  setLabGrant,
  type LabCategory,
  type LabKey,
} from "@/entities/lab";
import { errorCode } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Badge, ErrorNotice, Switch } from "@/shared/ui";

interface LabRow {
  key: LabKey;
  category: LabCategory;
  /** Undefined where the viewer does not decide it (an Institution Admin does not grant). */
  granted?: boolean;
  enabled: boolean;
}

interface LabAccessProps {
  institutionId: string;
  /** A Platform Admin grants labs and may also switch them; an Institution Admin only switches granted ones. */
  canGrant: boolean;
}

/**
 * Which labs the institution's members may open. Both switches must be on for
 * a lab to be available; the backend applies the same rule to every request.
 */
export function LabAccess({ institutionId, canGrant }: LabAccessProps) {
  const { labs, admin, errors, common } = useDictionary();
  const text = admin.labs;
  const load = useCallback(
    (): Promise<LabRow[]> => (canGrant ? fetchLabGrants(institutionId) : fetchLabSettings(institutionId)),
    [canGrant, institutionId],
  );
  const rows = useResource(load);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(id: string, action: () => Promise<void>) {
    setBusy(id);
    setActionError(null);
    try {
      await action();
      rows.reload();
    } catch (caught) {
      setActionError(errorCode(caught));
    } finally {
      setBusy(null);
    }
  }

  if (rows.error) {
    return <ErrorNotice message={errorMessage(errors, rows.error)} />;
  }
  if (!rows.data) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  if (rows.data.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{text.noneGranted}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      <ErrorNotice message={errorMessage(errors, actionError)} />
      {LAB_CATEGORIES.map((category) => {
        const inCategory = rows.data?.filter((row) => row.category === category) ?? [];
        if (inCategory.length === 0) {
          return null;
        }
        return (
          <section key={category} aria-label={labs.categories[category]} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">{labs.categories[category]}</h3>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {inCategory.map((row) => {
                const name = labs.names[row.key];
                const isAvailable = (row.granted ?? true) && row.enabled;
                return (
                  <li key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
                    <LabIcon labKey={row.key} category={row.category} size="sm" />
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted">{labs.descriptions[row.key]}</p>
                    </div>
                    <Badge tone={isAvailable ? "mint" : "neutral"}>{isAvailable ? text.available : text.unavailable}</Badge>
                    {canGrant && (
                      <span className="flex items-center gap-2 text-sm">
                        {text.granted}
                        <Switch
                          label={format(text.grantNamed, { lab: name })}
                          checked={row.granted ?? false}
                          isBusy={busy === `grant:${row.key}`}
                          onChange={(granted) =>
                            void act(`grant:${row.key}`, () => setLabGrant(institutionId, row.key, granted))
                          }
                        />
                      </span>
                    )}
                    <span className="flex items-center gap-2 text-sm">
                      {text.enabled}
                      <Switch
                        label={format(text.enableNamed, { lab: name })}
                        checked={row.enabled}
                        disabled={row.granted === false}
                        isBusy={busy === `enable:${row.key}`}
                        onChange={(enabled) =>
                          void act(`enable:${row.key}`, () => setLabEnabled(institutionId, row.key, enabled))
                        }
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
