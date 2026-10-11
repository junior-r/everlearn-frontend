"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  conversationKey,
  fetchConversations,
  isDirectMessage,
  mergeMessages,
  openConversation,
  PAGE_SIZE,
  peerOf,
  type Contact,
  type DirectMessage,
} from "@/entities/message";
import { roleTone } from "@/entities/session";
import { FindContact } from "@/features/messages/find-contact";
import { MessageThread } from "@/features/messages/send-message";
import { errorCode, realtime } from "@/shared/api";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { useResource } from "@/shared/lib/use-resource";
import { Avatar, Badge, Button, ErrorNotice } from "@/shared/ui";

/** The peer named in the address (`?with=`), so a conversation can be linked to and survives a reload. */
const PEER_PARAM = "with";

interface Thread {
  peerId: string;
  peer: Contact | null;
  messages: DirectMessage[];
  /** Whether there may be messages older than the ones loaded. */
  hasOlder: boolean;
  canWrite: boolean;
  error: string | null;
}

interface MessengerProps {
  institutionId: string;
  userId: string;
}

/**
 * Direct messages of the member in the institution: their conversations and a
 * search on one side, the open conversation on the other. New messages arrive
 * live; everything shown was also loaded over HTTP, so nothing is lost if the
 * live connection drops.
 */
export function Messenger({ institutionId, userId }: MessengerProps) {
  const { common, messages: text, roles, errors } = useDictionary();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const peerId = useSearchParams()?.get(PEER_PARAM) ?? null;
  const loadConversations = useCallback(() => fetchConversations(institutionId), [institutionId]);
  const conversations = useResource(loadConversations);
  const reloadConversations = conversations.reload;
  const [thread, setThread] = useState<Thread | null>(null);
  const current = thread?.peerId === peerId ? thread : null;

  const select = useCallback(
    (id: string | null) => router.replace(id ? `${pathname}?${new URLSearchParams({ [PEER_PARAM]: id })}` : pathname),
    [router, pathname],
  );

  // Opening a conversation loads it, which also marks it as read on the server
  useEffect(() => {
    if (!peerId) {
      return;
    }
    let cancelled = false;
    openConversation(institutionId, peerId)
      .then(({ peer, messages, canWrite }) => {
        if (!cancelled) {
          setThread({ peerId, peer, messages, canWrite, hasOlder: messages.length >= PAGE_SIZE, error: null });
          reloadConversations();
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setThread({ peerId, peer: null, messages: [], canWrite: false, hasOlder: false, error: errorCode(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [institutionId, peerId, reloadConversations]);

  // While a conversation is on screen the server sends no notice about it
  useEffect(() => {
    realtime.setViewing(peerId ? conversationKey(institutionId, peerId) : null);
    return () => realtime.setViewing(null);
  }, [institutionId, peerId]);

  useEffect(
    () =>
      realtime.on("message", (payload) => {
        if (!isDirectMessage(payload) || payload.institutionId !== institutionId) {
          return;
        }
        reloadConversations();
        if (peerId && peerOf(payload, userId) === peerId) {
          setThread((open) =>
            open?.peerId === peerId ? { ...open, messages: mergeMessages(open.messages, [payload]) } : open,
          );
          if (payload.senderId === peerId) {
            // Read on arrival: tell the server, so the conversation does not show as unread later
            void openConversation(institutionId, peerId)
              .then(reloadConversations)
              .catch(() => undefined);
          }
        }
      }),
    [institutionId, userId, peerId, reloadConversations],
  );

  async function loadOlder() {
    const oldest = current?.messages[0];
    if (!current || !oldest) {
      return;
    }
    try {
      const older = await openConversation(institutionId, current.peerId, oldest.createdAt);
      setThread((open) =>
        open?.peerId === current.peerId
          ? {
              ...open,
              messages: mergeMessages(older.messages, open.messages),
              hasOlder: older.messages.length >= PAGE_SIZE,
            }
          : open,
      );
    } catch (error) {
      setThread((open) => (open?.peerId === current.peerId ? { ...open, error: errorCode(error) } : open));
    }
  }

  const peerName = current?.peer ? `${current.peer.firstName} ${current.peer.lastName}` : "";
  return (
    <div className="grid h-[min(42rem,calc(100dvh-17rem))] min-h-96 overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:grid-cols-[20rem_minmax(0,1fr)]">
      {/* On a phone there is room for one pane: the list, or the open conversation */}
      <aside className={cn("flex min-h-0 flex-col gap-4 border-line p-4 md:border-r", peerId && "hidden md:flex")}>
        <FindContact institutionId={institutionId} onPick={(contact) => select(contact.userId)} />
        <ErrorNotice message={errorMessage(errors, conversations.error)} />
        <nav aria-label={text.list.label} className="min-h-0 flex-1 overflow-y-auto">
          {conversations.data === null && !conversations.error && (
            <p className="text-sm text-muted">{common.loading}</p>
          )}
          {conversations.data?.length === 0 && <p className="text-sm text-muted">{text.list.empty}</p>}
          <ul className="flex flex-col gap-1">
            {conversations.data?.map(({ peer, lastMessage, unread }) => {
              const name = `${peer.firstName} ${peer.lastName}`;
              const isCurrent = peer.userId === peerId;
              return (
                <li key={peer.userId}>
                  <button
                    type="button"
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => select(peer.userId)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                      isCurrent ? "bg-brand-soft" : "hover:bg-surface-muted",
                    )}
                  >
                    <Avatar name={name} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm", unread > 0 ? "font-semibold" : "font-medium")}>
                        {name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {lastMessage.senderId === userId && `${text.thread.you}: `}
                        {lastMessage.body}
                      </span>
                    </span>
                    {unread > 0 && (
                      <span
                        aria-label={format(text.list.unread, { count: String(unread) })}
                        className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-on-brand"
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <section
        aria-label={peerName ? format(text.thread.label, { name: peerName }) : text.thread.none}
        className={cn("flex min-h-0 flex-col", !peerId && "hidden md:flex")}
      >
        {!peerId && <p className="m-auto max-w-xs p-6 text-center text-sm text-muted">{text.thread.none}</p>}
        {peerId && !current && <p className="m-auto text-sm text-muted">{common.loading}</p>}
        {current && (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button
                type="button"
                aria-label={text.thread.back}
                onClick={() => select(null)}
                className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand md:hidden"
              >
                <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
              </button>
              {current.peer && (
                <>
                  <Avatar name={peerName} />
                  <h2 className="min-w-0 flex-1 truncate font-semibold">{peerName}</h2>
                  <span className="flex shrink-0 gap-1">
                    {current.peer.roles.map((role) => (
                      <Badge key={role} tone={roleTone[role]}>
                        {roles[role]}
                      </Badge>
                    ))}
                  </span>
                </>
              )}
            </header>
            {current.error && (
              <div className="p-4">
                <ErrorNotice message={errorMessage(errors, current.error)} />
              </div>
            )}
            {current.peer && (
              <>
                {current.hasOlder && (
                  <div className="flex justify-center border-b border-line p-2">
                    <Button size="sm" variant="secondary" onClick={loadOlder}>
                      {text.thread.older}
                    </Button>
                  </div>
                )}
                <MessageThread
                  institutionId={institutionId}
                  userId={userId}
                  peerId={current.peerId}
                  peerName={peerName}
                  canWrite={current.canWrite}
                  messages={current.messages}
                  onSent={(message) => {
                    setThread((open) =>
                      open?.peerId === message.recipientId
                        ? { ...open, messages: mergeMessages(open.messages, [message]) }
                        : open,
                    );
                    reloadConversations();
                  }}
                />
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
