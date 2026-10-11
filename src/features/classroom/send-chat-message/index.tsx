"use client";

import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { MAX_CHAT_LENGTH, sendChatMessage, type ChatMessage } from "@/entities/class-session";
import { errorMessage, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice } from "@/shared/ui";

interface ChatPanelProps {
  /** Everything the room has received so far, oldest first. */
  messages: ChatMessage[];
  /** The viewer's identity in the room, to tell their own messages apart. */
  selfId: string;
  roomToken: string;
}

/**
 * The class chat: the messages of the room and the form to send one. A sent
 * message is not added here; it shows up when the room delivers it, like everyone else's.
 */
export function ChatPanel({ messages, selfId, roomToken }: ChatPanelProps) {
  const { classroom, errors } = useDictionary();
  const text = classroom.chat;
  const locale = useLocale();
  const fieldId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const send = useCallback(
    async (content: string) => {
      await sendChatMessage(roomToken, content);
      return true;
    },
    [roomToken],
  );
  const { submit, isSubmitting, error } = useSubmit(send);
  const clock = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);

  useEffect(() => {
    // Keep the newest message in view
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (content && (await submit(content))) {
      setDraft("");
    }
  }

  function timeOf(message: ChatMessage): string {
    const sentAt = new Date(message.sentAt);
    return Number.isNaN(sentAt.getTime()) ? "" : clock.format(sentAt);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">{text.title}</h2>
      <div ref={logRef} role="log" aria-label={text.title} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">{text.empty}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {messages.map((message) => {
              const isOwn = message.senderId === selfId;
              return (
                <li key={message.id} className={cn("flex flex-col gap-1", isOwn && "items-end")}>
                  <p className="text-xs text-muted">
                    <span className="font-medium text-foreground">{isOwn ? text.you : message.senderName}</span>{" "}
                    <time dateTime={message.sentAt} className="font-mono">
                      {timeOf(message)}
                    </time>
                  </p>
                  <p
                    className={cn(
                      "max-w-full rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                      isOwn ? "bg-brand-soft" : "bg-surface-muted",
                    )}
                  >
                    {message.content}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <form
        aria-label={text.title}
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border-t border-line p-3"
      >
        <ErrorNotice message={errorMessage(errors, error)} />
        <div className="flex items-center gap-2">
          <label htmlFor={fieldId} className="sr-only">
            {text.message}
          </label>
          <input
            id={fieldId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_CHAT_LENGTH}
            autoComplete="off"
            placeholder={text.placeholder}
            className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm transition-colors placeholder:text-muted hover:border-brand/50 focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-offset-0 focus-visible:outline-brand/25"
          />
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={draft.trim() === ""}>
            <PaperPlaneRightIcon aria-hidden weight="fill" className="size-4" />
            {text.send}
          </Button>
        </div>
      </form>
    </section>
  );
}
