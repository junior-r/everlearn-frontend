/** How much of a conversation the backend accepts in one request. */
export const MAX_MESSAGES = 30;
export const MAX_MESSAGE_LENGTH = 4000;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** What the backend sends while the assistant answers; `done` or `error` comes last. */
export type AssistantEvent =
  | { type: "text"; delta: string }
  /** The assistant is looking something up. */
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "error"; code: string };

/** The roles the backend opens the assistant to. Guardians have no assistant yet. */
const ASSISTANT_ROLES = ["ADMIN", "COORDINATOR", "TEACHER", "STAFF", "STUDENT"];

/** Whether to offer the assistant to someone acting in an institution with these roles. */
export function canUseAssistant(roles: readonly string[], isPlatformAdmin: boolean): boolean {
  return isPlatformAdmin || roles.some((role) => ASSISTANT_ROLES.includes(role));
}

export type AssistantAudience = "ADMIN" | "STUDENT" | "OTHER";

/** What the assistant can look up for the member, to tell them what to ask. Mirrors the backend rule. */
export function assistantAudiences(roles: readonly string[], isPlatformAdmin: boolean): AssistantAudience[] {
  const audiences: AssistantAudience[] = [];
  if (isPlatformAdmin || roles.includes("ADMIN")) {
    audiences.push("ADMIN");
  }
  if (roles.includes("STUDENT")) {
    audiences.push("STUDENT");
  }
  return audiences.length > 0 ? audiences : ["OTHER"];
}
