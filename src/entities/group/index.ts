import { apiClient, forInstitution } from "@/shared/api";

/** A school term. Dates are YYYY-MM-DD. */
export interface AcademicPeriod {
  id: string;
  institutionId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface GroupSummary {
  id: string;
  institutionId: string;
  name: string;
  level: number;
  capacity: number | null;
  pensum: { id: string; code: string; name: string; version: number };
  period: { id: string; name: string };
  studentCount: number;
}

export interface PersonRef {
  membershipId: string;
  firstName: string;
  lastName: string;
}

/** One subject the group takes, with the Teacher assigned to it, if any. */
export interface GroupCourse {
  subjectId: string;
  code: string;
  name: string;
  weeklyHours: number;
  teacher: PersonRef | null;
}

/** A class: students following one pensum level together during one period. */
export interface Group extends GroupSummary {
  courses: GroupCourse[];
  students: Array<PersonRef & { email: string }>;
}

export function fetchPeriods(institutionId: string): Promise<AcademicPeriod[]> {
  return apiClient.request<AcademicPeriod[]>("/periods", { headers: forInstitution(institutionId) });
}

export function fetchGroups(institutionId: string): Promise<GroupSummary[]> {
  return apiClient.request<GroupSummary[]>("/groups", { headers: forInstitution(institutionId) });
}

export function fetchGroup(institutionId: string, groupId: string): Promise<Group> {
  return apiClient.request<Group>(`/groups/${groupId}`, { headers: forInstitution(institutionId) });
}
