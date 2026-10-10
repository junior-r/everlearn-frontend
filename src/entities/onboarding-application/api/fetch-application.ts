import { apiClient } from "@/shared/api";
import type { ApplicationResponse, OnboardingApplication } from "../model/types";

/** Resolves to the signed-in applicant's application, or null if they have not started. */
export async function fetchApplication(): Promise<OnboardingApplication | null> {
  const { application } = await apiClient.request<ApplicationResponse>("/onboarding/application");
  return application;
}
