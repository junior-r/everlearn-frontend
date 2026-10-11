"use client";

import { useState, type FormEvent } from "react";
import type { Institution } from "@/entities/institution";
import { apiClient, errorCode, forInstitution } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, TextField } from "@/shared/ui";

interface FirstAdmin {
  firstName: string;
  lastName: string;
  email: string;
}

interface CreatedInstitution {
  institution: Institution;
  admin: FirstAdmin;
  /** Null when the admin already had an account, or when registering them failed. */
  temporaryPassword: string | null;
  /** Set when the institution was created but its administrator was not. */
  adminError: string | null;
}

const setInstitutionActive = (id: string, isActive: boolean) =>
  apiClient.request<Institution>(`/institutions/${id}`, { method: "PATCH", body: { isActive } });

/**
 * Creates the institution and then its first Institution Admin. These are two
 * requests: if the second fails the institution still exists, and the result
 * says so instead of pretending nothing was created.
 */
async function createInstitutionWithAdmin(
  institution: { name: string; slug: string; timezone: string },
  admin: FirstAdmin,
): Promise<CreatedInstitution> {
  const created = await apiClient.request<Institution>("/institutions", {
    method: "POST",
    body: institution,
  });
  try {
    const registered = await apiClient.request<{ temporaryPassword: string | null }>("/members", {
      method: "POST",
      body: { ...admin, role: "ADMIN" },
      headers: forInstitution(created.id),
    });
    return {
      institution: created,
      admin,
      temporaryPassword: registered.temporaryPassword,
      adminError: null,
    };
  } catch (caught) {
    return { institution: created, admin, temporaryPassword: null, adminError: errorCode(caught) };
  }
}

const DEFAULT_TIMEZONE = "America/Caracas";

export function CreateInstitutionForm({ onCreated }: { onCreated(): void }) {
  const { admin, errors } = useDictionary();
  const text = admin.institutions;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<CreatedInstitution | null>(null);
  const { submit, isSubmitting, error } = useSubmit(createInstitutionWithAdmin);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submit({ name, slug, timezone }, { firstName, lastName, email });
    if (result) {
      setCreated(result);
      setName("");
      setSlug("");
      setFirstName("");
      setLastName("");
      setEmail("");
      onCreated();
    }
  }

  if (created) {
    const names = {
      name: `${created.admin.firstName} ${created.admin.lastName}`,
      institution: created.institution.name,
    };
    return (
      <div role="status" className="flex flex-col gap-4 rounded-lg border border-brand/40 p-4">
        <h3 className="font-semibold">{text.createdTitle}</h3>
        {created.adminError ? (
          <>
            <ErrorNotice message={errorMessage(errors, created.adminError)} />
            <p className="text-sm text-muted">{text.adminFailed}</p>
          </>
        ) : (
          <p className="text-sm text-muted">
            {format(created.temporaryPassword ? text.createdBody : text.createdExistingBody, names)}
          </p>
        )}
        {created.temporaryPassword && (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted">{text.adminEmail}</dt>
              <dd className="font-mono">{created.admin.email}</dd>
            </div>
            <div>
              <dt className="text-muted">{admin.members.temporaryPassword}</dt>
              <dd className="font-mono" data-testid="temporary-password">
                {created.temporaryPassword}
              </dd>
            </div>
          </dl>
        )}
        <Button variant="secondary" onClick={() => setCreated(null)}>
          {admin.members.dismiss}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.newTitle}>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.name}
        required
        maxLength={150}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label={text.slug}
        required
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        title={text.slugHint}
        maxLength={60}
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
      />
      <TextField
        label={text.timezone}
        required
        value={timezone}
        onChange={(event) => setTimezone(event.target.value)}
      />
      <fieldset className="flex flex-col gap-4 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-semibold">{text.firstAdminTitle}</legend>
        <TextField
          label={text.adminFirstName}
          required
          maxLength={100}
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <TextField
          label={text.adminLastName}
          required
          maxLength={100}
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <TextField
          label={text.adminEmail}
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </fieldset>
      <Button type="submit" isLoading={isSubmitting}>
        {admin.common.create}
      </Button>
    </form>
  );
}

interface InstitutionRowProps {
  institution: Institution;
  onChanged(): void;
}

export function ToggleInstitutionButton({ institution, onChanged }: InstitutionRowProps) {
  const { admin } = useDictionary();
  const { submit, isSubmitting } = useSubmit(setInstitutionActive);
  const label = institution.isActive ? admin.institutions.deactivate : admin.institutions.activate;

  async function handleClick() {
    if (await submit(institution.id, !institution.isActive)) {
      onChanged();
    }
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      isLoading={isSubmitting}
      onClick={handleClick}
      aria-label={`${label}: ${institution.name}`}
    >
      {label}
    </Button>
  );
}
