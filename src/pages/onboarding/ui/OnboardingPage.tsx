"use client";

import { CheckIcon, HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import {
  DOCUMENT_TYPES,
  fetchApplication,
  type DocumentType,
  type OnboardingApplication,
} from "@/entities/onboarding-application";
import { hasOwnPassword, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { DocumentCamera, uploadDocument } from "@/features/onboarding/capture-document";
import { ConfirmIdentityForm } from "@/features/onboarding/confirm-identity";
import { ApiError } from "@/shared/api";
import { errorMessage, format, useDictionary, useLocalizedRouter } from "@/shared/i18n";
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
    <ol className="mt-6 flex gap-2 text-xs font-medium lg:mt-0">
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
  // The onboarding API is closed until a temporary password has been replaced
  const isAuthenticated = session.status === "authenticated" && hasOwnPassword(session.user);

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
          {application?.status === "REJECTED" && application.rejectionReason && (
            <ErrorNotice
              message={format(onboarding.rejected, { reason: application.rejectionReason })}
            />
          )}
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
          {application.extracted?.confidence === 0 && <ErrorNotice message={onboarding.unreadable} />}
          <ConfirmIdentityForm
            application={application}
            onConfirmed={handleConfirmed}
            onRetake={() => setIsRetaking(true)}
          />
        </section>
      )}

      {step === "done" && (
        <section className="mt-6 flex flex-col gap-5">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-2xl bg-sun-soft text-sun-ink"
          >
            <HourglassMediumIcon weight="fill" className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{onboarding.submitted.title}</h1>
            <p className="mt-1.5 text-sm text-muted">{onboarding.submitted.body}</p>
          </div>
        </section>
      )}

      {/* Available at every step, so nobody is stuck signed in on a shared device */}
      <div className="mt-8">
        <LogoutButton />
      </div>
    </CenteredCard>
  );
}
