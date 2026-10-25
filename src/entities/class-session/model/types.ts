/** How the signed-in member takes part in a class: giving it or attending it. */
export type ClassroomRole = "TEACHER" | "STUDENT";

/** One subject of one group that the member teaches or attends. */
export interface ClassroomCourse {
  groupId: string;
  groupName: string;
  subject: { id: string; code: string; name: string };
  teacher: { membershipId: string; firstName: string; lastName: string } | null;
  role: ClassroomRole;
  /** The class in progress, if the Teacher has opened one. */
  openSessionId: string | null;
}

/** What the backend hands over to enter a class session's video room. */
export interface ClassroomAccess {
  token: string;
  roomName: string;
  /** The member's Membership id, which is their identity in the room. */
  identity: string;
  role: ClassroomRole;
  subjectName: string;
  groupName: string;
  /** ISO date-time the class started, the same for every participant. */
  startedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  /** ISO date-time. */
  sentAt: string;
  /** The video-server's proof of who wrote the message; it asks for it back to take the message down. */
  signature: string;
  /** Taken down by its author or the Teacher: it keeps its place, without its text. */
  isDeleted: boolean;
}

/** One transcribed stretch of speech, shown as a live caption. */
export interface Caption {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
}

/** The marks a Teacher may give, in the order they are offered. */
export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** One class of a course, as the Teacher who takes its attendance sees it. */
export interface CourseSession {
  id: string;
  /** ISO date-time. */
  startsAt: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  /** ISO date-time its room closed; null while open, and for a class recorded without video. */
  endedAt: string | null;
  /** Students who already have a mark for this class. */
  marked: number;
}

export interface CourseSessions {
  subjectName: string;
  groupName: string;
  sessions: CourseSession[];
}

/** A class of a course that has a transcript. */
export interface TranscribedSession {
  sessionId: string;
  /** ISO date-time. */
  startsAt: string;
  lines: number;
}

export interface CourseTranscripts {
  subjectName: string;
  groupName: string;
  sessions: TranscribedSession[];
}

/** One transcribed stretch of a past class. */
export interface TranscriptLine {
  id: string;
  /** Null when nobody was named as the speaker. */
  speakerName: string | null;
  text: string;
  /** ISO date-time. */
  startedAt: string;
  /** ISO date-time. */
  endedAt: string;
}

/** What was said in one class, in order. */
export interface ClassTranscript {
  sessionId: string;
  subjectName: string;
  groupName: string;
  /** ISO date-time. */
  startsAt: string;
  lines: TranscriptLine[];
}

/** One enrolled Student on the attendance sheet of a class. */
export interface AttendanceEntry {
  enrollmentId: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus | null;
  /** False when the mark came from the time the Student spent connected to a video class. */
  takenByHand: boolean;
}
