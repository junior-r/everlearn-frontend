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
