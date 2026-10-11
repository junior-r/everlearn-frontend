import { ApiError, apiClient, forInstitution } from "@/shared/api";
import { env } from "@/shared/config/env";
import type { ClassroomAccess, ClassroomCourse } from "./model/types";

export {
  appendUnique,
  CAPTIONS_TOPIC,
  CHAT_TOPIC,
  MAX_CHAT_LENGTH,
  parseCaption,
  parseChatMessage,
} from "./lib/room-messages";
export type { Caption, ChatMessage, ClassroomAccess, ClassroomCourse, ClassroomRole } from "./model/types";

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
