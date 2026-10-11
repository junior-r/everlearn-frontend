"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { streamAssistantReply } from "@/entities/assistant";
import { errorCode } from "@/shared/api";
import {
  canRetry,
  conversationReducer,
  emptyConversation,
  requestMessages,
  type ConversationMessage,
} from "./conversation";

/**
 * The conversation with the assistant, kept in memory for as long as the
 * component lives: it sends the history with each question and applies the
 * answer as it streams in.
 */
export function useAssistantChat(institutionId: string) {
  const [conversation, dispatch] = useReducer(conversationReducer, emptyConversation);
  const answering = useRef<AbortController | null>(null);

  const answer = useCallback(
    async (messages: ConversationMessage[]) => {
      const controller = new AbortController();
      answering.current = controller;
      const replyId = crypto.randomUUID();
      let finished = false;
      try {
        for await (const event of streamAssistantReply(institutionId, requestMessages(messages), controller.signal)) {
          finished ||= event.type === "done" || event.type === "error";
          dispatch({ type: "received", event, replyId });
        }
        if (!finished) {
          // The connection closed before the backend said the answer was complete
          dispatch({ type: "failed", code: "ASSISTANT_UNAVAILABLE" });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          dispatch({ type: "failed", code: errorCode(error) });
        }
      }
    },
    [institutionId],
  );

  // Leaving the page must not leave an answer streaming to nobody
  useEffect(() => () => answering.current?.abort(), []);

  const { messages, phase } = conversation;
  const isAnswering = phase !== "idle";

  function ask(question: string) {
    const content = question.trim();
    if (!content || isAnswering) {
      return;
    }
    const asked: ConversationMessage = { id: crypto.randomUUID(), role: "user", content };
    dispatch({ type: "asked", id: asked.id, content });
    void answer([...messages, asked]);
  }

  function retry() {
    if (canRetry(conversation)) {
      dispatch({ type: "retried" });
      void answer(messages);
    }
  }

  function stop() {
    answering.current?.abort();
    dispatch({ type: "stopped" });
  }

  function clear() {
    answering.current?.abort();
    dispatch({ type: "cleared" });
  }

  return { ...conversation, isAnswering, canRetry: canRetry(conversation), ask, retry, stop, clear };
}
