import type {
  ApplicationResponse,
  DocumentType,
  OnboardingApplication,
} from "@/entities/onboarding-application";
import { apiClient } from "@/shared/api";

export interface ConfirmedIdentity {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
}

export async function confirmIdentity(identity: ConfirmedIdentity): Promise<OnboardingApplication> {
  const { application } = await apiClient.request<ApplicationResponse>("/onboarding/confirm", {
    method: "POST",
    body: identity,
  });
  if (!application) {
    throw new Error("The server returned no application");
  }
  return application;
}
