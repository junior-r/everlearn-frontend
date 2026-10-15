import { ApiError, apiClient, forInstitution } from "@/shared/api";
import { env } from "@/shared/config/env";
import type {
  AttendanceEntry,
  AttendanceStatus,
  ChatMessage,
  ClassroomAccess,
  ClassroomCourse,
  CourseSessions,
} from "./model/types";

export {
  appendUnique,
  CAPTIONS_TOPIC,
  CHAT_DELETED_TOPIC,
  CHAT_TOPIC,
  HAND_ATTRIBUTE,
  MAX_CHAT_LENGTH,
  parseCaption,
  parseChatDeletion,
  parseChatMessage,
  ROLE_ATTRIBUTE,
  withDeleted,
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
 * Asks the video-server for something in the class. It knows who asks, and
 * whether they are the Teacher, from the room access token alone.
 */
async function askVideoServer(roomToken: string, path: string, body: object, failure: string): Promise<void> {
  const response = await fetch(`${env.videoServerUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${roomToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!response?.ok) {
    throw new ApiError(response?.status ?? 0, failure, `The video-server refused ${path}`);
  }
}

/** Sends a chat message to the class; it shows up when the room delivers it to everyone. */
export function sendChatMessage(roomToken: string, content: string): Promise<void> {
  return askVideoServer(roomToken, "/chat", { content }, "CHAT_NOT_SENT");
}

/** Takes a chat message down for everyone. Only its author and the Teacher of the class may. */
export function deleteChatMessage(roomToken: string, message: ChatMessage): Promise<void> {
  const { id, senderId, signature } = message;
  return askVideoServer(roomToken, "/chat/delete", { id, senderId, signature }, "CLASS_ACTION_FAILED");
}

/** Raises or lowers the member's own hand, which the whole class sees. */
export function setHandRaised(roomToken: string, raised: boolean): Promise<void> {
  return askVideoServer(roomToken, "/hand", { raised }, "CLASS_ACTION_FAILED");
}

/** Lowers a participant's hand. Only the Teacher of the class may. */
export function lowerParticipantHand(roomToken: string, identity: string): Promise<void> {
  return askVideoServer(roomToken, "/participants/lower-hand", { identity }, "CLASS_ACTION_FAILED");
}

/** Silences a participant's microphone; they can open it again. Only the Teacher of the class may. */
export function muteParticipant(roomToken: string, identity: string): Promise<void> {
  return askVideoServer(roomToken, "/participants/mute", { identity }, "CLASS_ACTION_FAILED");
}

/** Ends the class for everyone, which also takes its attendance. Only the Teacher of the class may. */
export function endClass(roomToken: string): Promise<void> {
  return askVideoServer(roomToken, "/class/end", {}, "CLASS_ACTION_FAILED");
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
