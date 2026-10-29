import { ApiError, apiClient, forInstitution } from "@/shared/api";
import { env } from "@/shared/config/env";
import { parseFeedPackets, type FeedPacket } from "./lib/room-feed";
import type {
  AttendanceEntry,
  AttendanceStatus,
  ChatMessage,
  ClassroomAccess,
  ClassroomCourse,
  ClassTranscript,
  CourseRecordings,
  CourseSessions,
  CourseTranscripts,
  RecordingLink,
} from "./model/types";

export {
  CAPTIONS_TOPIC,
  CHAT_DELETED_TOPIC,
  CHAT_TOPIC,
  HAND_ATTRIBUTE,
  MAX_CHAT_LENGTH,
  parseChatMessage,
  ROLE_ATTRIBUTE,
} from "./lib/room-messages";
export { EMPTY_FEED, withHistory, withPacket } from "./lib/room-feed";
export type { FeedPacket, RoomFeed } from "./lib/room-feed";
export { elapsedClock, lastedMinutes } from "./lib/class-time";
export { handQueue } from "./lib/hand-queue";
export { transcriptText } from "./lib/transcript-text";
export { recordingSize } from "./lib/recording";
export type { TranscriptTextLabels } from "./lib/transcript-text";
export type { HandHolder, RaisedHand } from "./lib/hand-queue";
export { ATTENDANCE_STATUSES } from "./model/types";
export type {
  AttendanceEntry,
  AttendanceStatus,
  Caption,
  ChatMessage,
  ClassroomAccess,
  ClassroomCourse,
  ClassroomRole,
  ClassRecording,
  ClassTranscript,
  CourseRecordings,
  CourseSession,
  CourseSessions,
  CourseTranscripts,
  RecordingLink,
  TranscribedSession,
  TranscriptLine,
} from "./model/types";

/** Where a Teacher takes the attendance of one subject of one group. */
export const courseAttendancePath = (groupId: string, subjectId: string) =>
  `/courses/${groupId}/${subjectId}/attendance`;

/** Where the Teacher and the Students of a course read what was said in its past classes. */
export const courseTranscriptsPath = (groupId: string, subjectId: string) =>
  `/courses/${groupId}/${subjectId}/transcripts`;

/** Where the Teacher and the Students of a course watch its recorded classes. */
export const courseRecordingsPath = (groupId: string, subjectId: string) =>
  `/courses/${groupId}/${subjectId}/recordings`;

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

/** The chat and captions the room had before the viewer arrived, as the video-server kept them. */
export async function fetchRoomFeed(roomToken: string, signal: AbortSignal): Promise<FeedPacket[]> {
  const response = await fetch(`${env.videoServerUrl}/feed`, {
    headers: { Authorization: `Bearer ${roomToken}` },
    signal,
  });
  if (!response.ok) {
    throw new ApiError(response.status, "FEED_UNAVAILABLE", "The video-server could not replay the class");
  }
  return parseFeedPackets(await response.json());
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

/**
 * Shows a lab to the class, or updates the one on show: its key and state go
 * into the room, and every browser draws it. Only the Teacher may, and only a
 * lab the backend listed in their token.
 */
export function shareLab(roomToken: string, labKey: string, state: object): Promise<void> {
  return askVideoServer(roomToken, "/lab", { labKey, state }, "LAB_SHARE_FAILED");
}

/** Takes the lab off show. Only the Teacher of the class may. */
export function stopSharingLab(roomToken: string): Promise<void> {
  return askVideoServer(roomToken, "/lab/stop", {}, "LAB_SHARE_FAILED");
}

/**
 * Starts recording the whole class: every camera, screen and voice. The room
 * announces it to everyone once it runs. Only the Teacher, where the backend allows it.
 */
export function startRecording(roomToken: string): Promise<void> {
  return askVideoServer(roomToken, "/recording/start", {}, "RECORDING_FAILED");
}

/** Stops recording; the file reaches the group's recordings a few minutes later. */
export function stopRecording(roomToken: string): Promise<void> {
  return askVideoServer(roomToken, "/recording/stop", {}, "RECORDING_FAILED");
}

const sessionsPath = (groupId: string, subjectId: string) => `/groups/${groupId}/courses/${subjectId}/sessions`;

/** The latest classes of a course, most recent first. Only for the Teacher assigned to it. */
export function fetchCourseSessions(institutionId: string, groupId: string, subjectId: string): Promise<CourseSessions> {
  return apiClient.request<CourseSessions>(sessionsPath(groupId, subjectId), {
    headers: forInstitution(institutionId),
  });
}

/** The classes of a course that have a transcript, most recent first. For its Teacher and its Students. */
export function fetchCourseTranscripts(
  institutionId: string,
  groupId: string,
  subjectId: string,
): Promise<CourseTranscripts> {
  return apiClient.request<CourseTranscripts>(`/groups/${groupId}/courses/${subjectId}/transcripts`, {
    headers: forInstitution(institutionId),
  });
}

/** What was said in a class, in order. */
export function fetchClassTranscript(institutionId: string, sessionId: string): Promise<ClassTranscript> {
  return apiClient.request<ClassTranscript>(`/class-sessions/${sessionId}/transcript`, {
    headers: forInstitution(institutionId),
  });
}

/** The recorded classes of a course, most recent first. For its Teacher and its Students. */
export function fetchCourseRecordings(
  institutionId: string,
  groupId: string,
  subjectId: string,
): Promise<CourseRecordings> {
  return apiClient.request<CourseRecordings>(`/groups/${groupId}/courses/${subjectId}/recordings`, {
    headers: forInstitution(institutionId),
  });
}

/** A short-lived link to play a recording, or to download it. */
export function fetchRecordingLink(institutionId: string, recordingId: string, download: boolean): Promise<RecordingLink> {
  return apiClient.request<RecordingLink>(
    `/class-recordings/${recordingId}/link${download ? "?download=true" : ""}`,
    { headers: forInstitution(institutionId) },
  );
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
