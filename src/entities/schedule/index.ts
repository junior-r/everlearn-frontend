import { apiClient, forInstitution } from "@/shared/api";
import type { TimeRange } from "./lib/grid";

export {
  cellKey,
  cellsFromWindows,
  DAYS,
  findInCell,
  formatTime,
  HOURS,
  parseTime,
  startsInCell,
  windowsFromCells,
} from "./lib/grid";
export type { DayOfWeek, TimeRange } from "./lib/grid";

/** One weekly class of a group. */
export interface ScheduledSlot extends TimeRange {
  id: string;
  groupId: string;
  groupName: string;
  subject: { id: string; code: string; name: string };
  teacher: { membershipId: string; firstName: string; lastName: string } | null;
  room: string | null;
}

export function fetchAvailability(
  institutionId: string,
  teacherMembershipId: string,
  periodId: string,
): Promise<TimeRange[]> {
  return apiClient.request<TimeRange[]>(
    `/teachers/${teacherMembershipId}/availability?periodId=${periodId}`,
    { headers: forInstitution(institutionId) },
  );
}

export function fetchGroupSchedule(institutionId: string, groupId: string): Promise<ScheduledSlot[]> {
  return apiClient.request<ScheduledSlot[]>(`/groups/${groupId}/schedule`, {
    headers: forInstitution(institutionId),
  });
}
