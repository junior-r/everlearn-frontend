"use client";

import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useActiveInstitution } from "@/entities/institution";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { localizedPath, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";

interface HeaderActionsProps {
  /** `inverse` on the dark navigation of the admin dashboard. */
  variant?: "default" | "inverse";
  /** Which edge the notification list lines up with, so it stays on screen. */
  align?: "left" | "right";
}

/**
 * What every signed-in screen offers beside its title: the way to direct
 * messages and the notification bell. Messages belong to an institution, so
 * their link shows only once one has been entered.
 */
export function HeaderActions({ variant = "default", align = "right" }: HeaderActionsProps) {
  const locale = useLocale();
  const { messages } = useDictionary();
  const { active } = useActiveInstitution();
  return (
    <div className="flex items-center gap-1">
      {active && (
        <Link
          href={localizedPath(locale, "/messages")}
          aria-label={messages.title}
          title={messages.title}
          className={cn(
            "grid size-10 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-brand",
            variant === "inverse"
              ? "text-on-ink/80 hover:bg-ink-raised hover:text-on-ink focus-visible:outline-sun"
              : "text-muted hover:bg-brand-soft hover:text-brand",
          )}
        >
          <ChatsCircleIcon aria-hidden className="size-5" />
        </Link>
      )}
      <NotificationBell variant={variant} align={align} />
    </div>
  );
}
