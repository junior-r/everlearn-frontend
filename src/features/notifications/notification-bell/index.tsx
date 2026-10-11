"use client";

import {
  BellIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  ChatCircleDotsIcon,
  ConfettiIcon,
  ExamIcon,
  HourglassMediumIcon,
  NotePencilIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  fetchNotifications,
  markNotificationsRead,
  notificationPath,
  type AppNotification,
  type NotificationType,
} from "@/entities/notification";
import { realtime } from "@/shared/api";
import { errorMessage, format, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { timeAgo } from "@/shared/lib/time-ago";
import { toneSoft, type Tone } from "@/shared/lib/tone";
import { useResource } from "@/shared/lib/use-resource";
import { ErrorNotice } from "@/shared/ui";

const LOOK: Record<NotificationType, { icon: Icon; tone: Tone }> = {
  WELCOME: { icon: ConfettiIcon, tone: "mint" },
  EVALUATION_PUBLISHED: { icon: NotePencilIcon, tone: "sky" },
  EVALUATION_DUE: { icon: HourglassMediumIcon, tone: "sun" },
  CLASS_STARTING: { icon: CalendarCheckIcon, tone: "grape" },
  DIRECT_MESSAGE: { icon: ChatCircleDotsIcon, tone: "pink" },
  GRADE_POSTED: { icon: ExamIcon, tone: "mint" },
  WARD_EVALUATION_PUBLISHED: { icon: NotePencilIcon, tone: "sky" },
  WARD_GRADE_POSTED: { icon: ExamIcon, tone: "mint" },
  WARD_ATTENDANCE: { icon: CalendarXIcon, tone: "coral" },
};

/** Above this, the badge stops counting: the exact figure no longer matters. */
const BADGE_LIMIT = 9;

interface NotificationBellProps {
  /** `inverse` on the dark navigation of the admin dashboard. */
  variant?: "default" | "inverse";
  /** Which edge of the bell the list lines up with, so it stays on screen. */
  align?: "left" | "right";
}

/**
 * The bell: how many notices are unread and, on click, the latest ones. It
 * reloads when the server says there is something new. Opening a notice marks
 * it as read and goes to what it is about.
 */
export function NotificationBell({ variant = "default", align = "right" }: NotificationBellProps) {
  const { notifications: text, errors } = useDictionary();
  const locale = useLocale();
  const router = useLocalizedRouter();
  const [isOpen, setIsOpen] = useState(false);
  const list = useResource(fetchNotifications);
  const { reload } = list;
  const container = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const unread = list.data?.unread ?? 0;

  useEffect(() => realtime.on("notification", reload), [reload]);

  // A click anywhere else, or Escape, puts the list away
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  async function open(notification: AppNotification) {
    setIsOpen(false);
    if (!notification.read) {
      // The notice leads somewhere either way; a failed mark only leaves it unread
      await markNotificationsRead([notification]).catch(() => undefined);
      reload();
    }
    router.push(notificationPath(notification));
  }

  async function markAllRead() {
    await markNotificationsRead().catch(() => undefined);
    reload();
  }

  const describe = (notification: AppNotification) => {
    const wording = text.types[notification.type];
    const facts = Object.fromEntries(
      Object.entries(notification.data).map(([key, value]) => [key, value === null ? "" : String(value)]),
    );
    // The backend sends what happened; how an absence reads is worded here, like the rest
    if (facts.status && Object.hasOwn(text.attendance, facts.status)) {
      facts.status = text.attendance[facts.status as keyof typeof text.attendance];
    }
    for (const key of ["dueAt", "startsAt", "date"]) {
      if (facts[key]) {
        facts[key] = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(facts[key]),
        );
      }
    }
    return { title: format(wording.title, facts), body: format(wording.body, facts) };
  };

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? format(text.openWithUnread, { count: String(unread) }) : text.open}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        title={text.title}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "relative grid size-10 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-brand",
          variant === "inverse"
            ? "text-on-ink/80 hover:bg-ink-raised hover:text-on-ink focus-visible:outline-sun"
            : "text-muted hover:bg-brand-soft hover:text-brand",
        )}
      >
        <BellIcon aria-hidden weight={unread > 0 ? "fill" : "regular"} className="size-5" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[0.625rem] leading-none font-bold text-ink"
          >
            {unread > BADGE_LIMIT ? `${BADGE_LIMIT}+` : unread}
          </span>
        )}
      </button>
      {isOpen && (
        <section
          id={panelId}
          aria-label={text.title}
          className={cn(
            "absolute top-full z-50 mt-2 flex max-h-[min(28rem,70dvh)] w-[min(22rem,calc(100vw-2rem))] animate-rise flex-col overflow-hidden rounded-2xl border border-line bg-surface text-foreground shadow-card",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="font-semibold">{text.title}</h2>
            <button
              type="button"
              disabled={unread === 0}
              onClick={markAllRead}
              className="rounded-lg text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              {text.markAllRead}
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.error && (
              <div className="p-3">
                <ErrorNotice message={errorMessage(errors, list.error)} />
              </div>
            )}
            {list.data?.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">{text.empty}</p>}
            <ul className="divide-y divide-line">
              {list.data?.items.map((notification) => {
                const { icon: TypeIcon, tone } = LOOK[notification.type];
                const { title, body } = describe(notification);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => open(notification)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        !notification.read && "bg-brand-soft/60",
                      )}
                    >
                      <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-xl", toneSoft[tone])}>
                        <TypeIcon weight="duotone" className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm", notification.read ? "font-medium" : "font-semibold")}>
                          {title}
                          {!notification.read && <span className="sr-only"> ({text.unread})</span>}
                        </span>
                        <span className="mt-0.5 block text-sm break-words text-muted">{body}</span>
                        <span className="mt-1 block text-xs text-muted">{timeAgo(notification.createdAt, locale)}</span>
                      </span>
                      {!notification.read && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
