"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "@/entities/session";
import { ApiError } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { Button, ErrorNotice, TextField } from "@/shared/ui";
import { login } from "../api/login";

interface LoginFormProps {
  initialErrorCode?: string | null;
  onSuccess(): void;
}

export function LoginForm({ initialErrorCode, onSuccess }: LoginFormProps) {
  const session = useSession();
  const { auth, errors } = useDictionary();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(initialErrorCode ?? null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorCode(null);
    try {
      session.establish(await login({ email, password }));
      onSuccess();
    } catch (caught) {
      setErrorCode(caught instanceof ApiError ? caught.code : "UNKNOWN");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ErrorNotice message={errorMessage(errors, errorCode)} />
      <TextField
        label={auth.login.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label={auth.login.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {auth.login.submit}
      </Button>
    </form>
  );
}
