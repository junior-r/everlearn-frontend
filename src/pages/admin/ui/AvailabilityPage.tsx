"use client";

import { useCallback, useState } from "react";
import { fetchPeriods } from "@/entities/group";
import { fetchMembers } from "@/entities/member";
import { AvailabilityEditor } from "@/features/scheduling/edit-availability";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice, SelectField } from "@/shared/ui";
import { AdminPage, WithActiveInstitution } from "@/widgets/admin-shell";

function Availability({ institutionId }: { institutionId: string }) {
  const { admin, common, errors } = useDictionary();
  const text = admin.availability;
  const members = useResource(useCallback(() => fetchMembers(institutionId), [institutionId]));
  const periods = useResource(useCallback(() => fetchPeriods(institutionId), [institutionId]));
  const [teacherId, setTeacherId] = useState("");
  const [periodId, setPeriodId] = useState("");

  if (members.data === null || periods.data === null) {
    const error = members.error ?? periods.error;
    return error ? (
      <ErrorNotice message={errorMessage(errors, error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }

  const teachers = members.data.filter(
    (member) => member.role === "TEACHER" && member.isActive && member.status === "ACTIVE",
  );
  // Fall back to the first choice, so each select and the editor always agree
  const teacher = teachers.find((member) => member.membershipId === teacherId) ?? teachers[0];
  const period = periods.data.find((candidate) => candidate.id === periodId) ?? periods.data[0];
  if (!teacher || !period) {
    return <p className="text-sm text-muted">{text.needsSetup}</p>;
  }

  const teacherName = `${teacher.firstName} ${teacher.lastName}`;
  return (
    <>
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <SelectField
          label={text.teacher}
          value={teacher.membershipId}
          onChange={(event) => setTeacherId(event.target.value)}
          options={teachers.map((member) => ({
            value: member.membershipId,
            label: `${member.firstName} ${member.lastName}`,
          }))}
        />
        <SelectField
          label={text.period}
          value={period.id}
          onChange={(event) => setPeriodId(event.target.value)}
          options={periods.data.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
        />
      </div>
      <AvailabilityEditor
        // Unsaved changes belong to one teacher and period, so switching starts afresh
        key={`${teacher.membershipId}:${period.id}`}
        institutionId={institutionId}
        teacher={{ membershipId: teacher.membershipId, name: teacherName }}
        periodId={period.id}
      />
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
