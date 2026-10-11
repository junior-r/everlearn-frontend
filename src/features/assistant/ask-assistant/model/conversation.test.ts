import { describe, expect, it } from "vitest";
import { MAX_MESSAGES, type AssistantEvent } from "@/entities/assistant";
import {
  canRetry,
  conversationReducer,
  emptyConversation,
  requestMessages,
  type Conversation,
  type ConversationAction,
} from "./conversation";

const play = (actions: ConversationAction[], from: Conversation = emptyConversation) =>
  actions.reduce(conversationReducer, from);
const asked = (content: string, id = `q-${content}`): ConversationAction => ({ type: "asked", id, content });
const received = (event: AssistantEvent, replyId = "reply-1"): ConversationAction => ({
  type: "received",
  event,
  replyId,
});
const text = (delta: string, replyId?: string) => received({ type: "text", delta }, replyId);

describe("conversationReducer", () => {
  it("shows the question at once and waits for the answer", () => {
    const state = play([asked("Hola")]);

    expect(state).toEqual({
      messages: [{ id: "q-Hola", role: "user", content: "Hola" }],
      phase: "waiting",
      error: null,
    });
  });

  it("writes the answer as its pieces arrive, then rests", () => {
    const writing = play([asked("Hola"), text("Hola, "), text("¿en qué te ayudo?")]);
    const done = conversationReducer(writing, received({ type: "done" }));

    expect(writing.phase).toBe("writing");
    expect(done.phase).toBe("idle");
    expect(done.messages).toEqual([
      { id: "q-Hola", role: "user", content: "Hola" },
      { id: "reply-1", role: "assistant", content: "Hola, ¿en qué te ayudo?" },
    ]);
  });

  it("says when the assistant is looking data up, and keeps one answer around the lookup", () => {
    const lookingUp = play([asked("Notas"), text("Un momento. "), received({ type: "tool", name: "getAcademicHistory" })]);
    const after = conversationReducer(lookingUp, text("Vas bien."));

    expect(lookingUp.phase).toBe("lookingUp");
    expect(after.messages).toHaveLength(2);
    expect(after.messages[1].content).toBe("Un momento. Vas bien.");
  });

  it("starts a new answer for each question", () => {
    const state = play([
      asked("Uno"),
      text("1", "reply-1"),
      received({ type: "done" }, "reply-1"),
      asked("Dos"),
      text("2", "reply-2"),
    ]);

    expect(state.messages.map((message) => message.content)).toEqual(["Uno", "1", "Dos", "2"]);
  });

  it("ignores a second question while one is being answered", () => {
    const state = play([asked("Uno"), asked("Dos")]);

    expect(state.messages).toHaveLength(1);
  });

  it("keeps what was written when the answer is stopped, and drops what arrives after", () => {
    const state = play([asked("Hola"), text("Hola, "), { type: "stopped" }, text("tarde"), received({ type: "done" })]);

    expect(state.phase).toBe("idle");
    expect(state.messages[1].content).toBe("Hola, ");
    expect(state.error).toBeNull();
  });

  it("keeps the question when the answer fails, so it can be retried", () => {
    const failed = play([asked("Hola"), { type: "failed", code: "NETWORK_ERROR" }]);
    const midway = play([asked("Hola"), text("Ho"), received({ type: "error", code: "ASSISTANT_UNAVAILABLE" })]);
    const retried = conversationReducer(failed, { type: "retried" });

    expect(failed).toMatchObject({ phase: "idle", error: "NETWORK_ERROR" });
    expect(canRetry(failed)).toBe(true);
    expect(midway.error).toBe("ASSISTANT_UNAVAILABLE");
    // A half-written answer is not asked for again: the member reads it and decides
    expect(canRetry(midway)).toBe(false);
    expect(retried).toMatchObject({ phase: "waiting", error: null });
    expect(retried.messages).toEqual(failed.messages);
    expect(canRetry(retried)).toBe(false);
  });

  it("forgets everything when cleared, and ignores events it does not know", () => {
    const state = play([asked("Hola"), text("Hola")]);
    const unknown = { type: "usage", tokens: 12 } as unknown as AssistantEvent;

    expect(conversationReducer(state, received(unknown))).toBe(state);
    expect(conversationReducer(state, { type: "cleared" })).toEqual(emptyConversation);
  });
});

describe("requestMessages", () => {
  it("sends roles and contents only, and the latest messages when there are too many", () => {
    const messages = Array.from({ length: MAX_MESSAGES + 5 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `mensaje ${index}`,
    }));

    const sent = requestMessages(messages);

    expect(sent).toHaveLength(MAX_MESSAGES);
    expect(sent[0]).toEqual({ role: "assistant", content: "mensaje 5" });
    expect(sent.at(-1)).toEqual({ role: "user", content: `mensaje ${MAX_MESSAGES + 4}` });
  });
});
