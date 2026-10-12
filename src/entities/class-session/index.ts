import { ApiError, apiClient, forInstitution } from "@/shared/api";
import { env } from "@/shared/config/env";
import type {
  AttendanceEntry,
  AttendanceStatus,
  ClassroomAccess,
  ClassroomCourse,
  CourseSessions,
} from "./model/types";

export {
  appendUnique,
  CAPTIONS_TOPIC,
  CHAT_TOPIC,
  MAX_CHAT_LENGTH,
  parseCaption,
  parseChatMessage,
} from "./lib/room-messages";
export { ATTENDANCE_STATUSES } from "./model/types";
export type {
  AttendanceEntry,
  AttendanceStatus,
  Caption,
  ChatMessage,
  ClassroomAccess,
  ClassroomCourse,
  ClassroomRole,
  CourseSession,
  CourseSessions,
} from "./model/types";

/** Where a Teacher takes the attendance of one subject of one group. */
export const courseAttendancePath = (groupId: string, subjectId: string) =>
  `/courses/${groupId}/${subjectId}/attendance`;

/** The subjects the signed-in member teaches or attends in the institution. */
export function fetchMyCourses(institutionId: string): Promise<ClassroomCourse[]> {
  return apiClient.request<ClassroomCourse[]>("/classroom/courses", {
    headers: forInstitution(institutionId),
  });
}

/** Opens a class for a subject of a group, or returns the one already open. Only its Teacher may. */
export function startClassSession(
  institutionId: string,
  groupId: string,
  subjectId: string,
): Promise<{ sessionId: string }> {
  return apiClient.request<{ sessionId: string }>(`/groups/${groupId}/courses/${subjectId}/sessions`, {
    method: "POST",
    headers: forInstitution(institutionId),
  });
}

export function requestClassroomAccess(institutionId: string, sessionId: string): Promise<ClassroomAccess> {
  return apiClient.request<ClassroomAccess>(`/class-sessions/${sessionId}/token`, {
    method: "POST",
    headers: forInstitution(institutionId),
  });
}

/**
 * Sends a chat message to the class. It goes to the video-server, which knows
 * the sender from the room access token and shows the message to everyone.
 */
export async function sendChatMessage(roomToken: string, content: string): Promise<void> {
  const response = await fetch(`${env.videoServerUrl}/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${roomToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }).catch(() => null);
  if (!response?.ok) {
    throw new ApiError(response?.status ?? 0, "CHAT_NOT_SENT", "The message could not be sent");
  }
}

const sessionsPath = (groupId: string, subjectId: string) => `/groups/${groupId}/courses/${subjectId}/sessions`;

/** The latest classes of a course, most recent first. Only for the Teacher assigned to it. */
export function fetchCourseSessions(institutionId: string, groupId: string, subjectId: string): Promise<CourseSessions> {
  return apiClient.request<CourseSessions>(sessionsPath(groupId, subjectId), {
    headers: forInstitution(institutionId),
  });
}

/** Records a class given without video, so its attendance can be taken. `startsAt` is an ISO date-time. */
export function recordHeldClass(
  institutionId: string,
  groupId: string,
  subjectId: string,
  startsAt: string,
): Promise<{ sessionId: string }> {
  return apiClient.request<{ sessionId: string }>(`${sessionsPath(groupId, subjectId)}/held`, {
    method: "POST",
    body: { startsAt },
    headers: forInstitution(institutionId),
  });
}

/** The enrolled Students of a class with the mark each has so far. */
export function fetchSessionAttendance(institutionId: string, sessionId: string): Promise<AttendanceEntry[]> {
  return apiClient.request<AttendanceEntry[]>(`/class-sessions/${sessionId}/attendance`, {
    headers: forInstitution(institutionId),
  });
}

/** Stores marks taken by hand and resolves to the sheet as it now stands. */
export function saveSessionAttendance(
  institutionId: string,
  sessionId: string,
  marks: Array<{ enrollmentId: string; status: AttendanceStatus }>,
): Promise<AttendanceEntry[]> {
  return apiClient.request<AttendanceEntry[]>(`/class-sessions/${sessionId}/attendance`, {
    method: "PUT",
    body: { marks },
    headers: forInstitution(institutionId),
  });
}
