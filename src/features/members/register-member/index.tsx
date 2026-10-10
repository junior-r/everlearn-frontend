"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { Member } from "@/entities/member";
import type { Role } from "@/entities/session";
import { apiClient, forInstitution } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, SelectField, TextField } from "@/shared/ui";

interface RegisteredMember {
  member: Member;
  temporaryPassword: string;
}

interface RegisterMemberFormProps {
  institutionId: string;
  /** Only a Platform Admin may appoint Institution Admins; the backend enforces this too. */
  canAppointAdmins: boolean;
  onRegistered(): void;
}

/**
 * Registers a Teacher or Student and shows their temporary password once.
 * The password is kept only in this component's state and is gone on dismiss.
 */
export function RegisterMemberForm({
  institutionId,
  canAppointAdmins,
  onRegistered,
}: RegisterMemberFormProps) {
  const { admin, errors, roles } = useDictionary();
  const text = admin.members;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [registered, setRegistered] = useState<RegisteredMember | null>(null);
  const register = useCallback(
    (body: { firstName: string; lastName: string; email: string; role: Role }) =>
      apiClient.request<RegisteredMember>("/members", {
        method: "POST",
        body,
        headers: forInstitution(institutionId),
      }),
    [institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(register);
  const roleOptions: Role[] = canAppointAdmins
    ? ["STUDENT", "TEACHER", "ADMIN"]
    : ["STUDENT", "TEACHER"];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submit({ firstName, lastName, email, role });
    if (result) {
      setRegistered(result);
      setFirstName("");
      setLastName("");
      setEmail("");
      onRegistered();
    }
  }

  if (registered) {
    const { member, temporaryPassword } = registered;
    return (
      <div role="status" className="flex flex-col gap-4 rounded-lg border border-brand/40 p-4">
        <div>
          <h3 className="font-semibold">{text.registeredTitle}</h3>
          <p className="mt-1 text-sm text-muted">
            {format(text.registeredBody, { name: `${member.firstName} ${member.lastName}` })}
          </p>
        </div>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-muted">{text.email}</dt>
            <dd className="font-mono">{member.email}</dd>
          </div>
          <div>
            <dt className="text-muted">{text.temporaryPassword}</dt>
            <dd className="font-mono" data-testid="temporary-password">
              {temporaryPassword}
            </dd>
          </div>
        </dl>
        <Button variant="secondary" onClick={() => setRegistered(null)}>
          {text.dismiss}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.newTitle}>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.firstName}
        required
        maxLength={100}
        value={firstName}
        onChange={(event) => setFirstName(event.target.value)}
      />
      <TextField
        label={text.lastName}
        required
        maxLength={100}
        value={lastName}
        onChange={(event) => setLastName(event.target.value)}
      />
      <TextField
        label={text.email}
        type="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <SelectField
        label={text.role}
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
        options={roleOptions.map((option) => ({ value: option, label: roles[option] }))}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {text.register}
      </Button>
    </form>
  );
}
