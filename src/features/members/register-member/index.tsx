"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { Member } from "@/entities/member";
import type { Role } from "@/entities/session";
import { apiClient, forInstitution } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, SelectField, TextField } from "@/shared/ui";

export interface RegisteredMember {
  member: Member;
  /** Null when the person already had an account and keeps their own credentials. */
  temporaryPassword: string | null;
}

interface RegisterMemberFormProps {
  institutionId: string;
  /** The roles this user may give, most junior first; the backend enforces the same rule. */
  allowedRoles: Role[];
  /** Called with every registration; one still pending must have their ID checked next. */
  onRegistered(registered: RegisteredMember): void;
}

/**
 * Registers a member. When nothing else is left to do, because the person was
 * already verified or needs no ID check, it shows the outcome here, with the
 * temporary password once; it lives only in this component's state.
 */
export function RegisterMemberForm({
  institutionId,
  allowedRoles,
  onRegistered,
}: RegisterMemberFormProps) {
  const { admin, errors, roles } = useDictionary();
  const text = admin.members;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  // Falls back to an allowed role, so the select and the request always agree
  const chosenRole = allowedRoles.includes(role) ? role : (allowedRoles[0] ?? "STUDENT");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submit({ firstName, lastName, email, role: chosenRole });
    if (result) {
      // A pending member goes on to their ID check, which shows the credentials instead
      setRegistered(result.member.isActive ? result : null);
      setFirstName("");
      setLastName("");
      setEmail("");
      onRegistered(result);
    }
  }

  if (registered) {
    const { member, temporaryPassword } = registered;
    return (
      <div role="status" className="flex flex-col gap-4 rounded-lg border border-brand/40 p-4">
        <div>
          <h3 className="font-semibold">
            {temporaryPassword ? text.registeredTitle : text.existingTitle}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {format(temporaryPassword ? text.registeredBody : text.existingBody, {
              name: `${member.firstName} ${member.lastName}`,
            })}
          </p>
        </div>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-muted">{text.email}</dt>
            <dd className="font-mono">{member.email}</dd>
          </div>
          {temporaryPassword && (
            <div>
              <dt className="text-muted">{text.temporaryPassword}</dt>
              <dd className="font-mono" data-testid="temporary-password">
                {temporaryPassword}
              </dd>
            </div>
          )}
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
        value={chosenRole}
        onChange={(event) => setRole(event.target.value as Role)}
        options={allowedRoles.map((option) => ({ value: option, label: roles[option] }))}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {text.register}
      </Button>
    </form>
  );
}
