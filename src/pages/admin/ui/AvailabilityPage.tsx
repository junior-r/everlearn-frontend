"use client";

import { useCallback, useState } from "react";
import { fetchPeriods } from "@/entities/group";
import { MemberPicker, type MemberMatch } from "@/entities/member";
import { AvailabilityEditor } from "@/features/scheduling/edit-availability";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, SelectField } from "@/shared/ui";
import { AdminPage, WithActiveInstitution } from "@/widgets/admin-shell";

function Availability({ institutionId }: { institutionId: string }) {
  const { admin, common, errors } = useDictionary();
  const text = admin.availability;
  const periods = useResource(useCallback(() => fetchPeriods(institutionId), [institutionId]));
  // No Teacher is chosen for the admin: an institution has too many to list, so one is searched for
  const [teacher, setTeacher] = useState<MemberMatch | null>(null);
  const [periodId, setPeriodId] = useState("");

  if (periods.data === null) {
    return periods.error ? (
      <ErrorNotice message={errorMessage(errors, periods.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }

  // Fall back to the first period, so the select and the editor always agree
  const period = periods.data.find((candidate) => candidate.id === periodId) ?? periods.data[0];
  if (!period) {
    return <p className="text-sm text-muted">{text.needsSetup}</p>;
  }

  return (
    <>
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <MemberPicker
          institutionId={institutionId}
          role="TEACHER"
          activeOnly
          label={text.teacher}
          value={teacher}
          onChange={setTeacher}
        />
        <SelectField
          label={text.period}
          value={period.id}
          onChange={(event) => setPeriodId(event.target.value)}
          options={periods.data.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
        />
      </div>
      {teacher ? (
        <AvailabilityEditor
          // Unsaved changes belong to one teacher and period, so switching starts afresh
          key={`${teacher.membershipId}:${period.id}`}
          institutionId={institutionId}
          teacher={{ membershipId: teacher.membershipId, name: `${teacher.firstName} ${teacher.lastName}` }}
          periodId={period.id}
        />
      ) : (
        <p className="text-sm text-muted">{text.pickTeacher}</p>
      )}
    </>
  );
}

export function AvailabilityPage() {
  const { admin } = useDictionary();
  return (
    <AdminPage title={admin.availability.title} subtitle={admin.availability.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <Availability key={institutionId} institutionId={institutionId} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
