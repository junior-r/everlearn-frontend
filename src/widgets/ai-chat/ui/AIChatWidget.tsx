"use client";

import { ArrowCounterClockwiseIcon, SparkleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { assistantAudiences, canUseAssistant, type AssistantAudience } from "@/entities/assistant";
import { useActiveInstitution } from "@/entities/institution";
import { hasOwnPassword, useSession } from "@/entities/session";
import { AssistantChat, useAssistantChat } from "@/features/assistant/ask-assistant";
import { localizedPath, useDictionary, useLocale } from "@/shared/i18n";

// Screens with a chat of their own in that corner: the virtual classroom fills the screen, and in
// direct messages the button would sit on top of the send button
const HIDDEN_ON = ["/class/", "/messages"];

const iconButton =
  "grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40";

interface FloatingAssistantProps {
  institutionId: string;
  audiences: AssistantAudience[];
}

function FloatingAssistant({ institutionId, audiences }: FloatingAssistantProps) {
  const { assistant: text } = useDictionary();
  const [isOpen, setIsOpen] = useState(false);
  // The conversation lives here, not in the panel, so closing the panel keeps it
  const chat = useAssistantChat(institutionId);
  const launcher = useRef<HTMLButtonElement>(null);

  function close() {
    setIsOpen(false);
    launcher.current?.focus();
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 print:hidden">
      {isOpen && (
        <section
          role="dialog"
          aria-label={text.title}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              close();
            }
          }}
          className="flex h-[min(34rem,calc(100dvh-6.5rem))] w-[min(24rem,calc(100vw-2rem))] animate-rise flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card"
        >
          <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <SparkleIcon aria-hidden weight="fill" className="size-5 text-brand" />
            <h2 className="flex-1 font-display text-base font-semibold">{text.title}</h2>
            <button
              type="button"
              className={iconButton}
              aria-label={text.clear}
              title={text.clear}
              disabled={chat.messages.length === 0}
              onClick={chat.clear}
            >
              <ArrowCounterClockwiseIcon aria-hidden weight="bold" className="size-4" />
            </button>
            <button type="button" className={iconButton} aria-label={text.close} title={text.close} onClick={close}>
              <XIcon aria-hidden weight="bold" className="size-4" />
            </button>
          </header>
          <AssistantChat chat={chat} audiences={audiences} />
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        // globals.css keeps the corner under small screens free while this button exists
        data-assistant-launcher
        aria-label={isOpen ? text.close : text.open}
        aria-expanded={isOpen}
        title={isOpen ? text.close : text.open}
        onClick={() => setIsOpen((open) => !open)}
        className="grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-lg shadow-brand/40 transition duration-150 hover:bg-brand-strong active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {isOpen ? (
          <XIcon aria-hidden weight="bold" className="size-6" />
        ) : (
          <SparkleIcon aria-hidden weight="fill" className="size-6" />
        )}
      </button>
    </div>
  );
}

/**
 * The AI assistant as a floating button in the corner of every screen of a
 * signed-in member who has entered an institution. Hiding it from other roles
 * is a convenience: the backend decides who may ask and what they may be told.
 */
export function AIChatWidget() {
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useSession();
  const institution = useActiveInstitution();
  const institutionId = institution.active?.id;
  if (!user || !hasOwnPassword(user) || !institutionId || institution.needsSelection) {
    return null;
  }
  if (HIDDEN_ON.some((path) => pathname?.startsWith(localizedPath(locale, path)))) {
    return null;
  }
  if (!canUseAssistant(institution.roles, user.isPlatformAdmin)) {
    return null;
  }
  return (
    <FloatingAssistant
      // A conversation belongs to one member in one institution
      key={`${user.id}:${institutionId}`}
      institutionId={institutionId}
      audiences={assistantAudiences(institution.roles, user.isPlatformAdmin)}
    />
  );
}
