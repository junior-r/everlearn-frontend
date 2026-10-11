import { apiClient, forInstitution, readEventStream } from "@/shared/api";
import type { AssistantEvent, ChatMessage } from "./model/types";

export { assistantAudiences, canUseAssistant, MAX_MESSAGE_LENGTH, MAX_MESSAGES } from "./model/types";
export type { AssistantAudience, AssistantEvent, ChatMessage } from "./model/types";

/**
 * Asks the assistant to answer the last message of a conversation and yields
 * its answer as it is written. The backend decides what the member may be told.
 */
export async function* streamAssistantReply(
  institutionId: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<AssistantEvent> {
  const body = await apiClient.requestStream("/ai/chat", {
    method: "POST",
    body: { messages },
    headers: forInstitution(institutionId),
    signal,
  });
  for await (const data of readEventStream(body)) {
    yield JSON.parse(data) as AssistantEvent;
  }
}
