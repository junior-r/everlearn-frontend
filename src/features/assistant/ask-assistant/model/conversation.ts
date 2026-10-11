import { MAX_MESSAGES, type AssistantEvent, type ChatMessage } from "@/entities/assistant";

export interface ConversationMessage extends ChatMessage {
  id: string;
}

/** `waiting`: no answer yet. `lookingUp`: the assistant is reading data. `writing`: text is arriving. */
export type Phase = "idle" | "waiting" | "lookingUp" | "writing";

export interface Conversation {
  messages: ConversationMessage[];
  phase: Phase;
  /** Backend error code of the answer that failed; the question stays, to be retried. */
  error: string | null;
}

export type ConversationAction =
  | { type: "asked"; id: string; content: string }
  | { type: "retried" }
  /** `replyId` names the answer a first piece of text starts. */
  | { type: "received"; event: AssistantEvent; replyId: string }
  | { type: "stopped" }
  | { type: "failed"; code: string }
  | { type: "cleared" };

export const emptyConversation: Conversation = { messages: [], phase: "idle", error: null };

const isAnswering = (state: Conversation) => state.phase !== "idle";

function received(state: Conversation, event: AssistantEvent, replyId: string): Conversation {
  switch (event.type) {
    case "text": {
      const last = state.messages.at(-1);
      // Text before and after a lookup belongs to the same answer
      const messages =
        last?.id === replyId
          ? [...state.messages.slice(0, -1), { ...last, content: last.content + event.delta }]
          : [...state.messages, { id: replyId, role: "assistant" as const, content: event.delta }];
      return { ...state, messages, phase: "writing" };
    }
    case "tool":
      return { ...state, phase: "lookingUp" };
    case "done":
      return { ...state, phase: "idle" };
    case "error":
      return { ...state, phase: "idle", error: event.code };
    default:
      // An event type added by a newer backend changes nothing
      return state;
  }
}

/** The chat as the member sees it, moved forward by what they do and what the backend sends. */
export function conversationReducer(state: Conversation, action: ConversationAction): Conversation {
  switch (action.type) {
    case "asked":
      return isAnswering(state)
        ? state
        : {
            messages: [...state.messages, { id: action.id, role: "user", content: action.content }],
            phase: "waiting",
            error: null,
          };
    case "retried":
      return isAnswering(state) ? state : { ...state, phase: "waiting", error: null };
    case "received":
      // Events of an answer that was stopped may still be in flight
      return isAnswering(state) ? received(state, action.event, action.replyId) : state;
    case "stopped":
      return { ...state, phase: "idle" };
    case "failed":
      return { ...state, phase: "idle", error: action.code };
    case "cleared":
      return emptyConversation;
  }
}

/** What to send the backend: the latest messages that fit one request, ending with the question. */
export function requestMessages(messages: ConversationMessage[]): ChatMessage[] {
  return messages.slice(-MAX_MESSAGES).map(({ role, content }) => ({ role, content }));
}

/** Whether the last question has no answer, so it can be asked again. */
export function canRetry(state: Conversation): boolean {
  return state.phase === "idle" && state.error !== null && state.messages.at(-1)?.role === "user";
}
