import type {
  ApplicationResponse,
  DocumentType,
  OnboardingApplication,
} from "@/entities/onboarding-application";
import { apiClient } from "@/shared/api";

/** Sends the ID photo for OCR. Resolves once the backend has read it, which takes a few seconds. */
export async function uploadDocument(
  photo: Blob,
  documentType: DocumentType,
): Promise<OnboardingApplication> {
  const body = new FormData();
  body.append("documentType", documentType);
  body.append("file", photo, "document.jpg");
  const { application } = await apiClient.request<ApplicationResponse>("/onboarding/document", {
    method: "POST",
    body,
  });
  if (!application) {
    throw new Error("The server returned no application");
  }
  return application;
}
