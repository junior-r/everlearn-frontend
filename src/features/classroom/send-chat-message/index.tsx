"use client";

import { PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { MAX_CHAT_LENGTH, sendChatMessage, type ChatMessage } from "@/entities/class-session";
import { errorMessage, useDictionary, useLocale } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice } from "@/shared/ui";
import { MessageRow } from "./MessageRow";

interface ChatPanelProps {
  /** Everything the room has received so far, oldest first. */
  messages: ChatMessage[];
  /** The viewer's identity in the room, to tell their own messages apart. */
  selfId: string;
  roomToken: string;
  /** The viewer is the Teacher of the class, who may take down anyone's message. */
  canModerate: boolean;
  /** Takes a message down for everyone; the room then delivers the removal like a message. */
  onDelete(message: ChatMessage): void;
  onClose(): void;
}

/**
 * The class chat: the messages of the room and the form to send one. A sent
 * message is not added here; it shows up when the room delivers it, like everyone else's.
 */
export function ChatPanel({ messages, selfId, roomToken, canModerate, onDelete, onClose }: ChatPanelProps) {
  const { classroom, errors } = useDictionary();
  const text = classroom.chat;
  const locale = useLocale();
  const fieldId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
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

  const reply = useCallback((message: ChatMessage) => {
    setDraft((current) => (current.trim() ? current : `@${message.senderName} `));
    fieldRef.current?.focus();
  }, []);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line py-2 pr-2 pl-4">
        <h2 className="text-sm font-semibold">{text.title}</h2>
        <button
          type="button"
          aria-label={classroom.controls.chatClose}
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-muted transition duration-150 hover:bg-surface-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-brand"
        >
          <XIcon aria-hidden weight="bold" className="size-4" />
        </button>
      </div>
      <div ref={logRef} role="log" aria-label={text.title} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">{text.empty}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                isOwn={message.senderId === selfId}
                canModerate={canModerate}
                time={timeOf(message)}
                onReply={reply}
                onDelete={onDelete}
              />
            ))}
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
            ref={fieldRef}
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
