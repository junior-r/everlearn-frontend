"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  fetchDocumentPhoto,
  type ApplicationReview,
} from "@/entities/onboarding-application";
import { apiClient, forInstitution } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { roleTone } from "@/entities/session";
import { Avatar, Badge, Button, ErrorNotice, TextField } from "@/shared/ui";

type Decision = "APPROVE" | "REJECT";

/** Loads the private ID photo into an object URL that is released when the card goes away. */
function useDocumentPhoto(institutionId: string, applicationId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchDocumentPhoto(institutionId, applicationId)
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [institutionId, applicationId]);

  return { url, failed };
}

interface ReviewApplicationCardProps {
  institutionId: string;
  application: ApplicationReview;
  onReviewed(): void;
}

/** One pending application: the ID photo beside the registered, OCR and confirmed data, with the decision. */
export function ReviewApplicationCard({
  institutionId,
  application,
  onReviewed,
}: ReviewApplicationCardProps) {
  const { admin, errors, roles, onboarding } = useDictionary();
  const text = admin.reviews;
  const { applicant, extracted, confirmed } = application;
  const registeredName = `${applicant.firstName} ${applicant.lastName}`;
  const photo = useDocumentPhoto(institutionId, application.id);
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const review = useCallback(
    (decision: Decision, rejectionReason?: string) =>
      apiClient.request<unknown>(`/onboarding/application/${application.id}/review`, {
        method: "POST",
        body: { decision, reason: rejectionReason },
        headers: forInstitution(institutionId),
      }),
    [application.id, institutionId],
  );
  const { submit, isSubmitting, error } = useSubmit(review);

  async function decide(decision: Decision, rejectionReason?: string) {
    if ((await submit(decision, rejectionReason)) !== null) {
      onReviewed();
    }
  }

  function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void decide("REJECT", reason);
  }

  const fullName = (person: { firstName: string; lastName: string } | null) =>
    person ? `${person.firstName} ${person.lastName}`.trim() : text.notAvailable;
  const rows = [
    { label: text.name, registered: registeredName, extracted: fullName(extracted), confirmed: fullName(confirmed) },
    {
      label: text.documentNumber,
      registered: text.notAvailable,
      extracted: extracted?.documentNumber ?? text.notAvailable,
      confirmed: confirmed?.documentNumber ?? text.notAvailable,
    },
    {
      label: text.birthDate,
      registered: text.notAvailable,
      extracted: extracted?.birthDate ?? text.notAvailable,
      confirmed: confirmed?.birthDate ?? text.notAvailable,
    },
  ];

  return (
    <article
      aria-label={registeredName}
      className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Avatar name={registeredName} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{registeredName}</h2>
          <p className="truncate text-sm text-muted">{applicant.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {application.requestedRole && (
            <Badge tone={roleTone[application.requestedRole]}>{roles[application.requestedRole]}</Badge>
          )}
          {application.documentType && (
            <Badge tone="neutral">{onboarding.documentType[application.documentType]}</Badge>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="flex aspect-[85.6/53.98] items-center justify-center overflow-hidden rounded-xl bg-ink ring-4 ring-surface-muted">
          {photo.url && (
            // A blob URL of a private image; next/image cannot fetch or optimise it
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={format(text.photoAlt, { name: registeredName })}
              className="size-full object-contain"
            />
          )}
          {photo.failed && <p className="p-4 text-center text-sm text-white">{text.photoUnavailable}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">{text.field}</th>
                <th scope="col" className="py-2 pr-4 font-medium">{text.registered}</th>
                <th scope="col" className="py-2 pr-4 font-medium">{text.extracted}</th>
                <th scope="col" className="py-2 font-medium">{text.confirmed}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="py-2 pr-4 font-medium">{row.label}</th>
                  <td className="py-2 pr-4">{row.registered}</td>
                  <td className="py-2 pr-4">{row.extracted}</td>
                  <td className="py-2">{row.confirmed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ErrorNotice message={errorMessage(errors, error)} />

      {isRejecting ? (
        <form onSubmit={handleReject} className="flex flex-col gap-3">
          <TextField
            label={text.reason}
            required
            maxLength={500}
            title={text.reasonHint}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-xs text-muted">{text.reasonHint}</p>
          <div className="flex gap-3">
            <Button type="submit" size="sm" variant="danger" isLoading={isSubmitting}>
              {text.confirmReject}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsRejecting(false)}>
              {text.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-3">
          <Button size="sm" isLoading={isSubmitting} onClick={() => decide("APPROVE")}>
            {text.approve}
          </Button>
          <Button size="sm" variant="danger" disabled={isSubmitting} onClick={() => setIsRejecting(true)}>
            {text.reject}
          </Button>
        </div>
      )}
    </article>
  );
}
