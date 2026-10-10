"use client";

import { useCallback } from "react";
import { fetchPendingReviews } from "@/entities/onboarding-application";
import { ReviewApplicationCard } from "@/features/reviews/review-application";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice } from "@/shared/ui";
import { AdminPage, WithActiveInstitution } from "@/widgets/admin-shell";

function Reviews({ institutionId }: { institutionId: string }) {
  const { admin, common, errors } = useDictionary();
  const load = useCallback(() => fetchPendingReviews(institutionId), [institutionId]);
  const reviews = useResource(load);

  if (reviews.data === null && reviews.isLoading) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  const pending = reviews.data ?? [];
  return (
    <>
      <ErrorNotice message={errorMessage(errors, reviews.error)} />
      {pending.length === 0 && !reviews.error && (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">
          {admin.reviews.empty}
        </p>
      )}
      {pending.map((application) => (
        <ReviewApplicationCard
          key={application.id}
          institutionId={institutionId}
          application={application}
          onReviewed={reviews.reload}
        />
      ))}
    </>
  );
}

export function ReviewsPage() {
  const { admin } = useDictionary();
  return (
    <AdminPage title={admin.reviews.title} subtitle={admin.reviews.subtitle}>
      <WithActiveInstitution>
        {(institutionId) => <Reviews key={institutionId} institutionId={institutionId} />}
      </WithActiveInstitution>
    </AdminPage>
  );
}
