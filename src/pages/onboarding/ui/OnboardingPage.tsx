"use client";

import { useEffect, useState } from "react";
import {
  DOCUMENT_TYPES,
  fetchApplication,
  type DocumentType,
  type OnboardingApplication,
} from "@/entities/onboarding-application";
import { useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { DocumentCamera, uploadDocument } from "@/features/onboarding/capture-document";
import { ConfirmIdentityForm } from "@/features/onboarding/confirm-identity";
import { ApiError } from "@/shared/api";
import { errorMessage, useDictionary, useLocalizedRouter } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { CenteredCard, ErrorNotice, PageStatus, SelectField } from "@/shared/ui";

type Step = "capture" | "confirm" | "done";

const STEPS: Step[] = ["capture", "confirm", "done"];

function stepFor(application: OnboardingApplication | null, isRetaking: boolean): Step {
  if (application?.status === "NEEDS_REVIEW" || application?.status === "APPROVED") {
    return "done";
  }
  return application?.status === "PENDING_CONFIRMATION" && !isRetaking ? "confirm" : "capture";
}

function StepIndicator({ current }: { current: Step }) {
  const { onboarding } = useDictionary();
  return (
    <ol className="mt-6 flex gap-2 text-xs font-medium">
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={step === current ? "step" : undefined}
          className={cn(
            "flex-1 border-t-2 pt-2",
            STEPS.indexOf(current) >= index ? "border-brand text-foreground" : "border-line text-muted",
          )}
        >
          {index + 1}. {onboarding.steps[step]}
        </li>
      ))}
    </ol>
  );
}

/** The identity check a new account must complete: photograph the ID, confirm what was read, wait for review. */
export function OnboardingPage() {
  const router = useLocalizedRouter();
  const session = useSession();
  const { common, onboarding, errors } = useDictionary();
  const [application, setApplication] = useState<OnboardingApplication | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("NATIONAL_ID");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const isAuthenticated = session.status === "authenticated";

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    }
  }, [session.status, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    let cancelled = false;
    fetchApplication()
      .then((current) => !cancelled && setApplication(current))
      .catch((caught: unknown) => {
        if (!cancelled) {
          setErrorCode(caught instanceof ApiError ? caught.code : "UNKNOWN");
        }
      })
      .finally(() => !cancelled && setIsLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function handlePhoto(photo: Blob) {
    setIsProcessing(true);
    setErrorCode(null);
    try {
      setApplication(await uploadDocument(photo, documentType));
      setIsRetaking(false);
    } catch (caught) {
      setErrorCode(caught instanceof ApiError ? caught.code : "UNKNOWN");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleConfirmed(confirmed: OnboardingApplication) {
    setApplication(confirmed);
    // The confirmed names replace the ones typed at registration; a failure here only delays that
    void session.reload().catch(() => undefined);
  }

  if (!isAuthenticated || !isLoaded) {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const step = stepFor(application, isRetaking);
  return (
    <CenteredCard brand={common.brand} wide>
      <StepIndicator current={step} />

      {step === "capture" && (
        <section className="mt-6 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{onboarding.title}</h1>
            <p className="mt-1.5 text-sm text-muted">{onboarding.subtitle}</p>
          </div>
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
                options={DOCUMENT_TYPES.map((type) => ({
                  value: type,
                  label: onboarding.documentType[type],
                }))}
              />
              <DocumentCamera onConfirm={handlePhoto} />
            </>
          )}
        </section>
      )}

      {step === "confirm" && application && (
        <section className="mt-6 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{onboarding.confirm.title}</h1>
            <p className="mt-1.5 text-sm text-muted">{onboarding.confirm.subtitle}</p>
          </div>
          <ConfirmIdentityForm
            application={application}
            onConfirmed={handleConfirmed}
            onRetake={() => setIsRetaking(true)}
          />
        </section>
      )}

      {step === "done" && (
        <section className="mt-6 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{onboarding.submitted.title}</h1>
            <p className="mt-1.5 text-sm text-muted">{onboarding.submitted.body}</p>
          </div>
          <LogoutButton />
        </section>
      )}
    </CenteredCard>
  );
}
