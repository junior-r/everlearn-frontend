"use client";

import {
  BooksIcon,
  BuildingsIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  ChalkboardTeacherIcon,
  GearSixIcon,
  IdentificationCardIcon,
  TreeStructureIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useActiveInstitution } from "@/entities/institution";
import {
  ADMIN_SECTIONS,
  adminSections,
  hasOwnPassword,
  useSession,
  type AdminSection,
} from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Avatar, Button, Logo, PageHeader, PageStatus } from "@/shared/ui";

const sectionPath = (section: AdminSection) => `/admin/${section}`;

const sectionIcons: Record<AdminSection, Icon> = {
  institutions: BuildingsIcon,
  members: UsersThreeIcon,
  reviews: IdentificationCardIcon,
  subjects: BooksIcon,
  pensums: TreeStructureIcon,
  groups: ChalkboardTeacherIcon,
  availability: CalendarCheckIcon,
  schedule: CalendarDotsIcon,
};

/**
 * Tells the user which institution the dashboard is acting on.
 * - A Platform Admin is either at platform level or has explicitly entered an
 *   institution, and gets a clear way back out.
 * - Institution Admins and Staff see their institution and, if they belong to
 *   several, a link to the selector.
 */
function InstitutionContext({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  const locale = useLocale();
  const router = useLocalizedRouter();
  const { admin } = useDictionary();
  const { institutions, active, clear } = useActiveInstitution();

  if (isPlatformAdmin) {
    if (!active) {
      return (
        <p
          className="rounded-xl bg-sun px-3 py-2 text-sm font-semibold text-ink"
          data-testid="admin-context"
        >
          {admin.platform.mode}
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-ink-raised p-3 text-sm">
        <p className="text-on-ink/60">{admin.platform.managing}</p>
        <p className="font-medium" data-testid="active-institution">
          {active.name}
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            clear();
            router.replace(sectionPath("institutions"));
          }}
        >
          {admin.platform.exit}
        </Button>
      </div>
    );
  }
  if (!active) {
    return null;
  }
  return (
    <div className="rounded-xl bg-ink-raised p-3 text-sm">
      <p className="text-on-ink/60">{admin.institutionSwitcher.label}</p>
      <p className="font-medium" data-testid="active-institution">
        {active.name}
      </p>
      {institutions.length > 1 && (
        <Link
          href={localizedPath(locale, "/select-institution")}
          className="mt-1 inline-block font-medium text-sun underline-offset-4 hover:underline"
        >
          {admin.institutionSwitcher.change}
        </Link>
      )}
    </div>
  );
}

/**
 * Frame of the admin dashboard. It shows only the sections the user's role
 * allows and sends them away from the others, but that is a convenience:
 * every admin request is authorized again by the backend.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const session = useSession();
  const institution = useActiveInstitution();
  const { admin, common } = useDictionary();
  const user = session.user;
  const isUsable = user !== null && hasOwnPassword(user) && user.status === "ACTIVE";
  // Until the institutions are known, there is no telling which role applies
  const isDeciding = isUsable && institution.isLoading;
  const sections = isUsable ? adminSections(user, institution.active?.id ?? null) : [];
  const current = ADMIN_SECTIONS.find(
    (section) => pathname === localizedPath(locale, sectionPath(section)),
  );
  const isAdminRoot = pathname === localizedPath(locale, "/admin");
  const isAllowedHere = isAdminRoot ? sections.length > 0 : current !== undefined && sections.includes(current);
  const fallback = sections.length > 0 ? sectionPath(sections[0]) : "/";

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    } else if (session.status === "authenticated" && !isDeciding && (!isAllowedHere || isAdminRoot)) {
      // Covers both "not an admin here" and "an admin, but not for this section"
      router.replace(fallback);
    }
  }, [session.status, isDeciding, isAllowedHere, isAdminRoot, fallback, router]);

  if (!user || isDeciding || !isAllowedHere || isAdminRoot) {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const userName = `${user.firstName} ${user.lastName}`;
  return (
    <div className="mx-auto flex min-h-page max-w-7xl flex-col gap-6 px-4 py-4 md:flex-row md:gap-8 md:py-6">
      <aside className="relative flex shrink-0 flex-col gap-5 overflow-hidden rounded-3xl bg-ink p-5 text-on-ink md:sticky md:top-6 md:h-[calc(100dvh-3rem)] md:w-64">
        <span aria-hidden className="pattern-fine-dots pointer-events-none absolute inset-0 text-on-ink" />
        <div className="relative flex flex-col gap-4">
          <Logo name={common.brand} variant="inverse" />
          <div className="flex items-center gap-3">
            <Avatar name={userName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{admin.title}</p>
              <p className="truncate text-xs text-on-ink/60" title={user.email}>
                {user.email}
              </p>
            </div>
          </div>
        </div>
        <div className="relative">
          <InstitutionContext isPlatformAdmin={user.isPlatformAdmin} />
        </div>
        <nav aria-label={admin.nav.label} className="relative md:min-h-0 md:flex-1 md:overflow-y-auto">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {sections.map((section) => {
              const href = localizedPath(locale, sectionPath(section));
              const isCurrent = pathname === href;
              const SectionIcon = sectionIcons[section];
              return (
                <li key={section}>
                  <Link
                    href={href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sun",
                      isCurrent
                        ? "bg-brand text-on-brand shadow-sm shadow-brand/40"
                        : "text-on-ink/75 hover:bg-ink-raised hover:text-on-ink",
                    )}
                  >
                    <SectionIcon aria-hidden weight={isCurrent ? "fill" : "regular"} className="size-5 shrink-0" />
                    {admin.nav[section]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="relative flex flex-col gap-3">
          <Link
            href={localizedPath(locale, "/settings")}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-on-ink/75 transition-colors hover:bg-ink-raised hover:text-on-ink"
          >
            <GearSixIcon aria-hidden className="size-5 shrink-0" />
            {admin.nav.settings}
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 animate-rise md:py-2">{children}</main>
    </div>
  );
}

/** Page heading for an admin section. */
export function AdminPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}

/** Renders its children with the active institution; the shell guarantees there is one on these pages. */
export function WithActiveInstitution({ children }: { children(institutionId: string): ReactNode }) {
  const { common } = useDictionary();
  const { active } = useActiveInstitution();
  if (!active) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  return <>{children(active.id)}</>;
}
