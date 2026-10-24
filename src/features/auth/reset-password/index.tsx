"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/shared/api";
import { errorMessage, useDictionary, useLocale } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice, TextField, useHumanCheck } from "@/shared/ui";

const MIN_LENGTH = 8;
const MAX_LENGTH = 72;

// Both calls are made signed out, so they must not try to refresh a session
const requestReset = (body: { email: string; locale: string }, headers?: Record<string, string>) =>
  apiClient.request<void>("/auth/forgot-password", { method: "POST", body, headers, skipAuth: true }).then(() => true);

const resetPassword = (body: { token: string; newPassword: string }) =>
  apiClient.request<void>("/auth/reset-password", { method: "POST", body, skipAuth: true }).then(() => true);

/** What follows a form once it has done its job. */
function Done({ children }: { children: string }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-xl bg-mint-soft px-3 py-2.5 text-sm text-mint-ink">
      <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Asks for a reset link by email. The answer is the same whether or not the
 * address has an account, so this form cannot be used to find out who has one.
 */
export function ForgotPasswordForm() {
  const { auth, errors } = useDictionary();
  const text = auth.forgotPassword;
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const { submit, isSubmitting, error } = useSubmit(requestReset);
  const humanCheck = useHumanCheck("forgot-password");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit({ email, locale }, humanCheck.headers)) {
      setIsSent(true);
    } else {
      humanCheck.reset();
    }
  }

  if (isSent) {
    return <Done>{text.sent}</Done>;
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.title}>
      <ErrorNotice message={errorMessage(errors, error)} />
      <TextField
        label={text.email}
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {humanCheck.widget}
      <Button type="submit" isLoading={isSubmitting} disabled={!humanCheck.isReady}>
        {text.submit}
      </Button>
    </form>
  );
}

interface ResetPasswordFormProps {
  /** The token of the reset link. */
  token: string;
  onReset?(): void;
}

/** Chooses a new password with the token of a reset link, which works once. */
export function ResetPasswordForm({ token, onReset }: ResetPasswordFormProps) {
  const { auth, errors } = useDictionary();
  const text = auth.resetPassword;
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const { submit, isSubmitting, error } = useSubmit(resetPassword);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    if (await submit({ token, newPassword })) {
      setIsDone(true);
      onReset?.();
    }
  }

  if (isDone) {
    return <Done>{text.done}</Done>;
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.title}>
      <ErrorNotice message={errorMessage(errors, mismatch ? "PASSWORDS_DO_NOT_MATCH" : error)} />
      <TextField
        label={auth.changePassword.new}
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_LENGTH}
        maxLength={MAX_LENGTH}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      <TextField
        label={auth.changePassword.confirm}
        type="password"
        autoComplete="new-password"
        required
        maxLength={MAX_LENGTH}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      <p className="text-xs text-muted">{auth.changePassword.hint}</p>
      <Button type="submit" isLoading={isSubmitting}>
        {text.submit}
      </Button>
    </form>
  );
}
