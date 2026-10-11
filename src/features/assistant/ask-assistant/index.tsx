"use client";

import { ArrowClockwiseIcon, PaperPlaneRightIcon, SparkleIcon, StopIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_MESSAGE_LENGTH, type AssistantAudience } from "@/entities/assistant";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button, ErrorNotice } from "@/shared/ui";
import { useAssistantChat } from "./model/use-assistant-chat";

export { useAssistantChat } from "./model/use-assistant-chat";

type Chat = ReturnType<typeof useAssistantChat>;

interface AssistantChatProps {
  chat: Chat;
  /** What the assistant can look up for the member, to suggest what to ask. */
  audiences: AssistantAudience[];
}

/** Three dots that pulse while the assistant has not written anything yet. */
function Typing({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-surface-muted px-3.5 py-2.5 text-sm text-muted">
      <span aria-hidden className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-pulse rounded-full bg-brand"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      {label}
    </p>
  );
}

/**
 * The conversation with the AI assistant: what was said, what is being
 * answered, and the field to ask the next question.
 */
export function AssistantChat({ chat, audiences }: AssistantChatProps) {
  const { assistant: text, errors } = useDictionary();
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const { messages, phase, isAnswering } = chat;
  const lastContent = messages.at(-1)?.content;

  useEffect(() => {
    input.current?.focus();
  }, []);

  // Keep the newest words in view while the answer grows
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages.length, lastContent, phase]);

  function send(question: string) {
    chat.ask(question);
    setDraft("");
    input.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, as in every chat; Shift+Enter writes a new line
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!isAnswering) {
        send(draft);
      }
    }
  }

  return (
    <>
      <div
        ref={log}
        role="log"
        aria-label={text.conversation}
        aria-busy={isAnswering}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-2xl bg-brand-soft p-3.5 text-sm">
              <SparkleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-brand" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">{text.greeting}</p>
                {audiences.map((audience) => (
                  <p key={audience} className="text-muted">
                    {text.hints[audience]}
                  </p>
                ))}
              </div>
            </div>
            <ul aria-label={text.suggestionsLabel} className="flex flex-col items-start gap-2">
              {audiences.flatMap((audience) =>
                text.suggestions[audience].map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-sm transition-colors hover:border-brand/50 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {suggestion}
                    </button>
                  </li>
                )),
              )}
            </ul>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap",
              message.role === "user"
                ? "self-end rounded-br-md bg-brand text-on-brand"
                : "self-start rounded-bl-md bg-surface-muted",
            )}
          >
            <span className="sr-only">{message.role === "user" ? text.you : text.assistant}: </span>
            {message.content}
          </div>
        ))}
        {phase === "waiting" && <Typing label={text.thinking} />}
        {phase === "lookingUp" && <Typing label={text.lookingUp} />}
        <ErrorNotice message={errorMessage(errors, chat.error)} />
        {chat.canRetry && (
          <Button size="sm" variant="secondary" className="self-start" onClick={chat.retry}>
            <ArrowClockwiseIcon aria-hidden weight="bold" className="size-4" />
            {text.retry}
          </Button>
        )}
      </div>
      <form onSubmit={handleSubmit} aria-label={text.title} className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={input}
            rows={1}
            aria-label={text.inputLabel}
            placeholder={text.placeholder}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm [field-sizing:content] transition-colors hover:border-brand/50 placeholder:text-muted focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
          />
          {isAnswering ? (
            <Button size="sm" variant="secondary" className="h-11" aria-label={text.stop} onClick={chat.stop}>
              <StopIcon aria-hidden weight="fill" className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="sm" className="h-11" aria-label={text.send} disabled={!draft.trim()}>
              <PaperPlaneRightIcon aria-hidden weight="fill" className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">{text.disclaimer}</p>
      </form>
    </>
  );
}
