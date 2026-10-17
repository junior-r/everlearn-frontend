"use client";

import { ArrowBendUpLeftIcon, CopyIcon, DotsThreeIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import type { ChatMessage } from "@/entities/class-session";
import { format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { ContextMenu, useContextMenu, type MenuAction } from "@/shared/ui";

interface MessageRowProps {
  message: ChatMessage;
  /** The viewer wrote it. */
  isOwn: boolean;
  /** The viewer is the Teacher of the class, who may take down anyone's message. */
  canModerate: boolean;
  /** The time it was sent, already formatted. */
  time: string;
  onReply(message: ChatMessage): void;
  onDelete(message: ChatMessage): void;
}

/**
 * One message of the class chat. Its menu (right click, or the button beside
 * it) offers what the viewer may do: a reader copies and replies, the author
 * and the Teacher can also take it down for everyone.
 */
export function MessageRow({ message, isOwn, canModerate, time, onReply, onDelete }: MessageRowProps) {
  const text = useDictionary().classroom.chat;
  const menu = useContextMenu();
  const actions: MenuAction[] = message.isDeleted
    ? []
    : [
        {
          id: "copy",
          label: text.copy,
          icon: CopyIcon,
          // Copying can be refused by the browser; there is nothing useful to say about it
          onSelect: () => void navigator.clipboard?.writeText(message.content).catch(() => undefined),
        },
        ...(isOwn ? [] : [{ id: "reply", label: text.reply, icon: ArrowBendUpLeftIcon, onSelect: () => onReply(message) }]),
        ...(isOwn || canModerate
          ? [{ id: "delete", label: text.delete, icon: TrashIcon, isDanger: true, onSelect: () => onDelete(message) }]
          : []),
      ];
  const menuLabel = isOwn ? text.ownOptions : format(text.options, { name: message.senderName });

  return (
    <li
      onContextMenu={actions.length > 0 ? menu.openAtPointer : undefined}
      className={cn("group flex flex-col gap-1", isOwn && "items-end")}
    >
      <p className="text-xs text-muted">
        <span className="font-medium text-foreground">{isOwn ? text.you : message.senderName}</span>{" "}
        <time dateTime={message.sentAt} className="font-mono">
          {time}
        </time>
      </p>
      <div className={cn("flex max-w-full items-center gap-1", isOwn && "flex-row-reverse")}>
        {message.isDeleted ? (
          <p className="rounded-2xl border border-dashed border-line px-3 py-2 text-sm text-muted italic">
            {text.deleted}
          </p>
        ) : (
          <p
            className={cn(
              "min-w-0 rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
              isOwn ? "bg-brand-soft" : "bg-surface-muted",
            )}
          >
            {message.content}
          </p>
        )}
        {actions.length > 0 && (
          <button
            type="button"
            aria-label={menuLabel}
            aria-haspopup="menu"
            onClick={menu.openBelow}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 transition duration-150 group-hover:opacity-100 hover:bg-surface-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand [@media(hover:none)]:opacity-100"
          >
            <DotsThreeIcon aria-hidden weight="bold" className="size-5" />
          </button>
        )}
      </div>
      <ContextMenu label={menuLabel} actions={actions} anchor={menu.anchor} onClose={menu.close} />
    </li>
  );
}
