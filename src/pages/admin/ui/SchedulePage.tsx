"use client";

import { useCallback, useMemo, useState } from "react";
import { fetchGroup, fetchGroups } from "@/entities/group";
import { ScheduleBuilder } from "@/features/scheduling/build-schedule";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, SelectField } from "@/shared/ui";
import { AdminPage, WithActiveInstitution } from "@/widgets/admin-shell";

function Schedule({ institutionId }: { institutionId: string }) {
  const { admin, common, errors } = useDictionary();
  const text = admin.schedule;
  const groups = useResource(useCallback(() => fetchGroups(institutionId), [institutionId]));
  const [groupId, setGroupId] = useState("");
  const chosenId = groups.data?.find((group) => group.id === groupId)?.id ?? groups.data?.[0]?.id;
  // The detail carries the group's subjects and their teachers, which the builder needs
  const loadGroup = useMemo(
    () => (chosenId ? () => fetchGroup(institutionId, chosenId) : null),
    [institutionId, chosenId],
  );
  const group = useResource(loadGroup);

  if (groups.data === null) {
    return groups.error ? (
      <ErrorNotice message={errorMessage(errors, groups.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  if (groups.data.length === 0) {
    return <p className="text-sm text-muted">{text.noGroups}</p>;
  }

  return (
    <>
      <div className="max-w-sm">
        <SelectField
          label={text.group}
          value={chosenId}
          onChange={(event) => setGroupId(event.target.value)}
          options={groups.data.map((candidate) => ({
            value: candidate.id,
            label: `${candidate.name} · ${candidate.period.name}`,
          }))}
        />
      </div>
      <ErrorNotice message={errorMessage(errors, group.error)} />
      {group.data ? (
        <ScheduleBuilder key={group.data.id} group={group.data} />
      ) : (
        !group.error && <p className="text-sm text-muted">{common.loading}</p>
      )}
    </>
  );
}

export function SchedulePage() {
  const { admin } = useDictionary();
  return (
    <AdminPage title={admin.schedule.title} subtitle={admin.schedule.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <Schedule key={institutionId} institutionId={institutionId} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
