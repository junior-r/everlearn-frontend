"use client";

import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_MESSAGE_LENGTH, sendMessage, type DirectMessage } from "@/entities/message";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice } from "@/shared/ui";

interface MessageThreadProps {
  institutionId: string;
  /** The signed-in user, to tell their own messages from the peer's. */
  userId: string;
  peerId: string;
  peerName: string;
  /** False for a conversation that can be read but no longer continued. */
  canWrite: boolean;
  messages: DirectMessage[];
  onSent(message: DirectMessage): void;
}

/** A conversation: what was said, oldest first, and the field to write the next message. */
export function MessageThread({
  institutionId,
  userId,
  peerId,
  peerName,
  canWrite,
  messages,
  onSent,
}: MessageThreadProps) {
  const { messages: text, errors } = useDictionary();
  const locale = useLocale();
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const send = useCallback((body: string) => sendMessage(institutionId, peerId, body), [institutionId, peerId]);
  const { submit, isSubmitting, error } = useSubmit(send);
  const time = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  const lastId = messages.at(-1)?.id;

  // Keep the newest message in view
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [lastId]);

  useEffect(() => {
    input.current?.focus();
  }, [peerId]);

  async function deliver() {
    const body = draft.trim();
    if (!body || isSubmitting) {
      return;
    }
    const sent = await submit(body);
    if (sent) {
      setDraft("");
      onSent(sent);
    }
    input.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void deliver();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, as in every chat; Shift+Enter writes a new line
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void deliver();
    }
  }

  return (
    <>
      <div
        ref={log}
        role="log"
        aria-label={format(text.thread.label, { name: peerName })}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && <p className="m-auto text-center text-sm text-muted">{text.thread.empty}</p>}
        {messages.map((message) => {
          const isOwn = message.senderId === userId;
          return (
            <div
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                isOwn ? "self-end rounded-br-md bg-brand text-on-brand" : "self-start rounded-bl-md bg-surface-muted",
              )}
            >
              <span className="sr-only">{isOwn ? text.thread.you : peerName}: </span>
              <p className="break-words whitespace-pre-wrap">{message.body}</p>
              <p className={cn("mt-1 text-right text-[0.6875rem]", isOwn ? "text-on-brand/75" : "text-muted")}>
                {time.format(new Date(message.createdAt))}
              </p>
            </div>
          );
        })}
      </div>
      {!canWrite && <p className="border-t border-line p-4 text-sm text-muted">{text.thread.closed}</p>}
      <form
        onSubmit={handleSubmit}
        hidden={!canWrite}
        aria-label={format(text.thread.form, { name: peerName })}
        className="flex flex-col gap-2 border-t border-line p-3"
      >
        <ErrorNotice message={errorMessage(errors, error)} />
        <div className="flex items-end gap-2">
          <textarea
            ref={input}
            rows={1}
            aria-label={text.thread.inputLabel}
            placeholder={text.thread.placeholder}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm [field-sizing:content] transition-colors hover:border-brand/50 placeholder:text-muted focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
          />
          <Button
            type="submit"
            size="sm"
            className="h-11"
            aria-label={text.thread.send}
            isLoading={isSubmitting}
            disabled={!draft.trim()}
          >
            <PaperPlaneRightIcon aria-hidden weight="fill" className="size-4" />
          </Button>
        </div>
      </form>
    </>
  );
}
