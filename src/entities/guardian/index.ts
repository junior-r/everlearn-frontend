import { apiClient, forInstitution } from "@/shared/api";
import type { GuardianLink, GuardianRelationship, Ward, WardOverview } from "./model/types";

export { GUARDIAN_RELATIONSHIPS } from "./model/types";
export type {
  AttendanceEntry,
  GuardianLink,
  GuardianRelationship,
  ScheduledClass,
  Ward,
  WardCourse,
  WardOverview,
} from "./model/types";

/** Every Guardian-Student link of the institution. For the office (Institution Admin, Staff). */
export function fetchGuardianLinks(institutionId: string): Promise<GuardianLink[]> {
  return apiClient.request<GuardianLink[]>("/guardian-links", { headers: forInstitution(institutionId) });
}

/** Ties a Guardian to a Student; linking the same two again only changes how they are related. */
export function linkGuardian(
  institutionId: string,
  body: { studentMembershipId: string; guardianMembershipId: string; relationship: GuardianRelationship },
): Promise<GuardianLink> {
  return apiClient.request<GuardianLink>("/guardian-links", {
    method: "PUT",
    body,
    headers: forInstitution(institutionId),
  });
}

export function unlinkGuardian(institutionId: string, linkId: string): Promise<void> {
  return apiClient.request<void>(`/guardian-links/${linkId}`, {
    method: "DELETE",
    headers: forInstitution(institutionId),
  });
}

/** The Students the signed-in Guardian answers for in the institution. */
export function fetchMyWards(institutionId: string): Promise<Ward[]> {
  return apiClient.request<Ward[]>("/guardian/wards", { headers: forInstitution(institutionId) });
}

/** One ward's schedule, averages, upcoming evaluations and attendance. Only for their own Guardian. */
export function fetchWardOverview(institutionId: string, studentMembershipId: string): Promise<WardOverview> {
  return apiClient.request<WardOverview>(`/guardian/wards/${studentMembershipId}`, {
    headers: forInstitution(institutionId),
  });
}
