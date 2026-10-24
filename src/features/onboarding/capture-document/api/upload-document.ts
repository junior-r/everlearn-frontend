import type {
  ApplicationResponse,
  DocumentType,
  OnboardingApplication,
} from "@/entities/onboarding-application";
import { apiClient, forInstitution } from "@/shared/api";

/** Sends the photo of a member's ID, taken at the desk, for OCR. Resolves once the backend has read it. */
export async function uploadDocument(
  institutionId: string,
  membershipId: string,
  photo: Blob,
  documentType: DocumentType,
): Promise<OnboardingApplication> {
  const body = new FormData();
  body.append("documentType", documentType);
  body.append("file", photo, "document.jpg");
  const { application } = await apiClient.request<ApplicationResponse>(
    `/onboarding/members/${membershipId}/document`,
    { method: "POST", body, headers: forInstitution(institutionId) },
  );
  return application;
}
