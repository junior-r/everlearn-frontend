"use client";

import { CheckIcon, SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import type { Member } from "@/entities/member";
import {
  DOCUMENT_TYPES,
  type DocumentType,
  type OnboardingApplication,
} from "@/entities/onboarding-application";
import { DocumentCamera, uploadDocument } from "@/features/onboarding/capture-document";
import { ConfirmIdentityForm } from "@/features/onboarding/confirm-identity";
import { ApiError } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button, ErrorNotice, SelectField } from "@/shared/ui";

type Step = "capture" | "confirm" | "done";

const STEPS: Step[] = ["capture", "confirm", "done"];

function StepIndicator({ current }: { current: Step }) {
  const { onboarding } = useDictionary();
  return (
    <ol className="flex gap-2 text-xs font-medium">
      {STEPS.map((step, index) => {
        const isDone = STEPS.indexOf(current) > index;
        const isCurrent = step === current;
        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2 transition-colors",
              isCurrent && "bg-brand-soft text-foreground",
              isDone && "text-mint-ink",
              !isCurrent && !isDone && "text-muted",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold",
                isCurrent && "bg-brand text-on-brand",
                isDone && "bg-mint-soft",
                !isCurrent && !isDone && "bg-surface-muted",
              )}
            >
              {isDone ? <CheckIcon weight="bold" className="size-3.5" /> : index + 1}
            </span>
            <span>
              <span className="sr-only">{index + 1}. </span>
              {onboarding.steps[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface IdentityCheckProps {
  institutionId: string;
  member: Member;
  /** For an account created just now: shown throughout, to hand over with the ID. */
  temporaryPassword: string | null;
  /** The member is active and the desk is done with them. */
  onFinished(): void;
  /** The desk leaves the check for another time; the member stays pending. */
  onLater(): void;
}

/**
 * The ID check at the enrolment desk: photograph the member's document, compare
 * what was read with the original and confirm it, which activates the member.
 */
export function IdentityCheck({ institutionId, member, temporaryPassword, onFinished, onLater }: IdentityCheckProps) {
  const { admin, errors, onboarding } = useDictionary();
  const text = onboarding.check;
  const [application, setApplication] = useState<OnboardingApplication | null>(null);
  const [isRetaking, setIsRetaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("NATIONAL_ID");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const name = `${member.firstName} ${member.lastName}`;

  async function handlePhoto(photo: Blob) {
    setIsProcessing(true);
    setErrorCode(null);
    try {
      setApplication(await uploadDocument(institutionId, member.membershipId, photo, documentType));
      setIsRetaking(false);
    } catch (caught) {
      setErrorCode(caught instanceof ApiError ? caught.code : "UNKNOWN");
    } finally {
      setIsProcessing(false);
    }
  }

  const step: Step =
    application?.status === "APPROVED"
      ? "done"
      : application?.status === "PENDING_CONFIRMATION" && !isRetaking
        ? "confirm"
        : "capture";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">{text.subtitle}</p>
      <StepIndicator current={step} />

      {temporaryPassword && (
        <div className="rounded-lg border border-brand/40 p-4 text-sm">
          <p className="text-muted">{text.credentials}</p>
          <dl className="mt-3 grid gap-2">
            <div>
              <dt className="text-muted">{admin.members.email}</dt>
              <dd className="font-mono">{member.email}</dd>
            </div>
            <div>
              <dt className="text-muted">{admin.members.temporaryPassword}</dt>
              <dd className="font-mono" data-testid="temporary-password">
                {temporaryPassword}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {step === "capture" && (
        <>
          <ErrorNotice message={errorMessage(errors, errorCode)} />
          {isProcessing ? (
            <p role="status" className="flex items-center gap-3 py-10 text-sm text-muted">
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-brand border-r-transparent"
              />
              {onboarding.processing}
            </p>
          ) : (
            <>
              <SelectField
                label={onboarding.documentType.label}
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                options={DOCUMENT_TYPES.map((type) => ({ value: type, label: onboarding.documentType[type] }))}
              />
              <DocumentCamera onConfirm={handlePhoto} />
              <Button variant="secondary" onClick={onLater}>
                {text.later}
              </Button>
            </>
          )}
        </>
      )}

      {step === "confirm" && application && (
        <>
          <div>
            <h3 className="font-semibold">{onboarding.confirm.title}</h3>
            <p className="mt-1 text-sm text-muted">{onboarding.confirm.subtitle}</p>
          </div>
          {application.extracted?.confidence === 0 && <ErrorNotice message={onboarding.unreadable} />}
          <ConfirmIdentityForm
            institutionId={institutionId}
            membershipId={member.membershipId}
            application={application}
            onConfirmed={setApplication}
            onRetake={() => setIsRetaking(true)}
          />
        </>
      )}

      {step === "done" && (
        <div role="status" className="flex flex-col gap-4">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-2xl bg-mint-soft text-mint-ink"
          >
            <SealCheckIcon weight="fill" className="size-6" />
          </span>
          <div>
            <h3 className="font-semibold">{format(text.doneTitle, { name })}</h3>
            <p className="mt-1 text-sm text-muted">{text.doneBody}</p>
          </div>
          <Button onClick={onFinished}>{text.finish}</Button>
        </div>
      )}
    </div>
  );
}
