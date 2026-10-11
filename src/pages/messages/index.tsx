"use client";

import { Suspense } from "react";
import { useSession, type Role } from "@/entities/session";
import { useDictionary } from "@/shared/i18n";
import { Messenger } from "@/widgets/messenger";
import { PortalShell } from "@/widgets/portal-shell";

// Any member of an institution may write to another; the backend checks both ends
const EVERY_ROLE: Role[] = ["ADMIN", "COORDINATOR", "TEACHER", "STAFF", "STUDENT", "GUARDIAN"];

/** Direct messages between members of the institution the user has entered. */
export function MessagesPage() {
  const { messages, common } = useDictionary();
  const { user } = useSession();
  return (
    <PortalShell title={messages.title} subtitle={messages.subtitle} roles={EVERY_ROLE}>
      {(institutionId) =>
        user && (
          // The open conversation is read from the address, unknown while the page prerenders
          <Suspense fallback={<p className="text-sm text-muted">{common.loading}</p>}>
            <Messenger
              // A conversation list belongs to one member in one institution
              key={`${user.id}:${institutionId}`}
              institutionId={institutionId}
              userId={user.id}
            />
          </Suspense>
        )
      }
    </PortalShell>
  );
}
