"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { Subject } from "@/entities/subject";
import { apiClient, errorCode, forInstitution } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, TextField } from "@/shared/ui";

interface CreateSubjectFormProps {
  institutionId: string;
  onCreated(): void;
}

export function CreateSubjectForm({ institutionId, onCreated }: CreateSubjectFormProps) {
  const { admin, errors } = useDictionary();
  const text = admin.subjects;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCallback(
    (body: { code: string; name: string; description?: string }) =>
      apiClient.request<Subject>("/subjects", {
        method: "POST",
        body,
        headers: forInstitution(institutionId),
      }),
    [institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(create);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit({ code, name, description: description || undefined })) {
      setCode("");
      setName("");
      setDescription("");
      onCreated();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.newTitle}>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.code}
        required
        pattern="[A-Za-z0-9][A-Za-z0-9._\-]*"
        maxLength={30}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <TextField
        label={text.name}
        required
        maxLength={150}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label={text.description}
        maxLength={1000}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {admin.common.create}
      </Button>
    </form>
  );
}

interface DeleteSubjectButtonProps {
  subject: Subject;
  onDeleted(): void;
  onError(code: string): void;
}

export function DeleteSubjectButton({ subject, onDeleted, onError }: DeleteSubjectButtonProps) {
  const { admin } = useDictionary();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    setIsDeleting(true);
    try {
      await apiClient.request<void>(`/subjects/${subject.id}`, {
        method: "DELETE",
        headers: forInstitution(subject.institutionId),
      });
      onDeleted();
    } catch (caught) {
      onError(errorCode(caught));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="danger"
      isLoading={isDeleting}
      onClick={handleClick}
      aria-label={`${admin.common.delete}: ${subject.name}`}
    >
      {admin.common.delete}
    </Button>
  );
}
