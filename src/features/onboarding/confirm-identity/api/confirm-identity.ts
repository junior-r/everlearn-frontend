import type {
  ApplicationResponse,
  ConfirmedIdentity,
  OnboardingApplication,
} from "@/entities/onboarding-application";
import { apiClient, forInstitution } from "@/shared/api";

/** Saves the data checked against the member's ID; the member is active once it resolves. */
export async function confirmIdentity(
  institutionId: string,
  membershipId: string,
  identity: ConfirmedIdentity,
): Promise<OnboardingApplication> {
  const { application } = await apiClient.request<ApplicationResponse>(
    `/onboarding/members/${membershipId}/confirm`,
    { method: "POST", body: identity, headers: forInstitution(institutionId) },
  );
  return application;
}
