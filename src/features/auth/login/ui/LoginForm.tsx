"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "@/entities/session";
import { ApiError } from "@/shared/api";
import { Button, TextField } from "@/shared/ui";
import { login } from "../api/login";
import { authErrorMessage } from "../model/auth-error-message";

interface LoginFormProps {
  initialErrorCode?: string | null;
  onSuccess(): void;
}

export function LoginForm({ initialErrorCode, onSuccess }: LoginFormProps) {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(() => authErrorMessage(initialErrorCode));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      session.establish(await login({ email, password }));
      onSuccess();
    } catch (caught) {
      setError(authErrorMessage(caught instanceof ApiError ? caught.code : "UNKNOWN"));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-surface px-3 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
