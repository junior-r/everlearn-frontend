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

/** One page of the members of an institution, with how many match in all. */
export interface MemberPage {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
}

/** The members table, a page at a time, narrowed by what was typed (name, email or document) and by role. */
export function fetchMemberPage(
  institutionId: string,
  filter: { page: number; query: string; role: Role | "" },
): Promise<MemberPage> {
  const params = new URLSearchParams({ page: String(filter.page) });
  if (filter.query.trim()) {
    params.set("query", filter.query.trim());
  }
  if (filter.role) {
    params.set("role", filter.role);
  }
  return apiClient.request<MemberPage>(`/members/page?${params}`, { headers: forInstitution(institutionId) });
}
