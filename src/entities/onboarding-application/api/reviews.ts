import { apiClient, forInstitution } from "@/shared/api";
import type { ApplicationReview } from "../model/types";

export function fetchPendingReviews(institutionId: string): Promise<ApplicationReview[]> {
  return apiClient.request<ApplicationReview[]>("/onboarding/applications/pending", {
    headers: forInstitution(institutionId),
  });
}

/** The ID photo, fetched with the access token because the endpoint is not public. */
export function fetchDocumentPhoto(institutionId: string, applicationId: string): Promise<Blob> {
  return apiClient.requestBlob(`/onboarding/application/${applicationId}/document`, {
    headers: forInstitution(institutionId),
  });
}
