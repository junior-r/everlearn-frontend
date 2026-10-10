"use client";

import { useState, type FormEvent } from "react";
import type { Institution } from "@/entities/institution";
import { apiClient } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, TextField } from "@/shared/ui";

interface NewInstitution {
  name: string;
  slug: string;
  timezone: string;
}

const createInstitution = (body: NewInstitution) =>
  apiClient.request<Institution>("/institutions", { method: "POST", body });

const setInstitutionActive = (id: string, isActive: boolean) =>
  apiClient.request<Institution>(`/institutions/${id}`, { method: "PATCH", body: { isActive } });

const DEFAULT_TIMEZONE = "America/Caracas";

export function CreateInstitutionForm({ onCreated }: { onCreated(): void }) {
  const { admin, errors } = useDictionary();
  const text = admin.institutions;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const { submit, isSubmitting, error } = useSubmit(createInstitution);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit({ name, slug, timezone })) {
      setName("");
      setSlug("");
      onCreated();
    }
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
      <Button type="submit" isLoading={isSubmitting}>
        {admin.common.create}
      </Button>
    </form>
  );
}

interface ToggleInstitutionButtonProps {
  institution: Institution;
  onChanged(): void;
}

export function ToggleInstitutionButton({ institution, onChanged }: ToggleInstitutionButtonProps) {
  const { admin } = useDictionary();
  const { submit, isSubmitting } = useSubmit(setInstitutionActive);

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
      aria-label={`${institution.isActive ? admin.institutions.deactivate : admin.institutions.activate}: ${institution.name}`}
    >
      {institution.isActive ? admin.institutions.deactivate : admin.institutions.activate}
    </Button>
  );
}
