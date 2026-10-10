"use client";

import { useState, type FormEvent } from "react";
import { useSession, type AuthResponse } from "@/entities/session";
import { apiClient } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, TextField } from "@/shared/ui";

const MIN_LENGTH = 8;
const MAX_LENGTH = 72;

const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  apiClient.request<AuthResponse>("/auth/change-password", { method: "POST", body });

/**
 * Replaces the password. The response carries a new access token, which is
 * what lifts the restriction of a temporary-password session.
 */
export function ChangePasswordForm({ onChanged }: { onChanged?(): void }) {
  const session = useSession();
  const { auth, errors } = useDictionary();
  const text = auth.changePassword;
  const isTemporary = session.user?.mustChangePassword === true;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const { submit, isSubmitting, error } = useSubmit(changePassword);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const response = await submit({ currentPassword, newPassword });
    if (response) {
      session.establish(response);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      onChanged?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.title}>
      <ErrorNotice message={errorMessage(errors, mismatch ? "PASSWORDS_DO_NOT_MATCH" : error)} />
      <TextField
        label={isTemporary ? text.currentTemporary : text.current}
        type="password"
        autoComplete="current-password"
        required
        maxLength={MAX_LENGTH}
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <TextField
        label={text.new}
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_LENGTH}
        maxLength={MAX_LENGTH}
        title={text.hint}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      <TextField
        label={text.confirm}
        type="password"
        autoComplete="new-password"
        required
        maxLength={MAX_LENGTH}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      <p className="text-xs text-muted">{text.hint}</p>
      <Button type="submit" isLoading={isSubmitting}>
        {text.submit}
      </Button>
    </form>
  );
}
