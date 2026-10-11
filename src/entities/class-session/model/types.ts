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
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  /** ISO date-time. */
  sentAt: string;
}

/** One transcribed stretch of speech, shown as a live caption. */
export interface Caption {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
}
