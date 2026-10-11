import type { Role, UserStatus } from "@/entities/session/@x/member";
import { apiClient, forInstitution } from "@/shared/api";

/** A person's account together with the role they hold in one institution. */
export interface Member {
  userId: string;
  membershipId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  isActive: boolean;
}

export function fetchMembers(institutionId: string): Promise<Member[]> {
  return apiClient.request<Member[]>("/members", { headers: forInstitution(institutionId) });
}

/** A member found by a search, with what tells two people of the same name apart. */
export interface MemberMatch {
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string | null;
}

/** A few members holding `role`, by name or document number. For the office (Institution Admin, Staff). */
export function searchMembers(
  institutionId: string,
  role: Role,
  query: string,
  signal?: AbortSignal,
): Promise<MemberMatch[]> {
  return apiClient.request<MemberMatch[]>(`/members/search?${new URLSearchParams({ role, query })}`, {
    headers: forInstitution(institutionId),
    signal,
  });
}
