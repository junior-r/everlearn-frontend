"use client";

import { useState, type FormEvent } from "react";
import type { OnboardingApplication } from "@/entities/onboarding-application";
import { ApiError } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { Button, ErrorNotice, TextField } from "@/shared/ui";
import { confirmIdentity } from "../api/confirm-identity";

interface ConfirmIdentityFormProps {
  application: OnboardingApplication;
  onConfirmed(application: OnboardingApplication): void;
  onRetake(): void;
}

/** Shows what the OCR read so the applicant can correct it before it is saved to their profile. */
export function ConfirmIdentityForm({ application, onConfirmed, onRetake }: ConfirmIdentityFormProps) {
  const { onboarding, errors } = useDictionary();
  const text = onboarding.confirm;
  const extracted = application.extracted;
  const [firstName, setFirstName] = useState(extracted?.firstName ?? "");
  const [lastName, setLastName] = useState(extracted?.lastName ?? "");
  const [documentNumber, setDocumentNumber] = useState(extracted?.documentNumber ?? "");
  const [birthDate, setBirthDate] = useState(extracted?.birthDate ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorCode(null);
    try {
      onConfirmed(
        await confirmIdentity({
          firstName,
          lastName,
          documentNumber,
          birthDate,
          documentType: application.documentType ?? "NATIONAL_ID",
        }),
      );
    } catch (caught) {
      setErrorCode(caught instanceof ApiError ? caught.code : "UNKNOWN");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ErrorNotice message={errorMessage(errors, errorCode)} />
      <TextField
        label={text.firstName}
        name="firstName"
        autoComplete="given-name"
        required
        maxLength={100}
        value={firstName}
        onChange={(event) => setFirstName(event.target.value)}
      />
      <TextField
        label={text.lastName}
        name="lastName"
        autoComplete="family-name"
        required
        maxLength={100}
        value={lastName}
        onChange={(event) => setLastName(event.target.value)}
      />
      <TextField
        label={text.documentNumber}
        name="documentNumber"
        required
        maxLength={40}
        value={documentNumber}
        onChange={(event) => setDocumentNumber(event.target.value)}
      />
      <TextField
        label={text.birthDate}
        name="birthDate"
        type="date"
        autoComplete="bday"
        required
        value={birthDate}
        onChange={(event) => setBirthDate(event.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {text.submit}
      </Button>
      <Button type="button" variant="secondary" onClick={onRetake} disabled={isSubmitting}>
        {text.retake}
      </Button>
    </form>
  );
}
