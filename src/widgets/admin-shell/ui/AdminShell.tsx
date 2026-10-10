"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { canAccessAdmin, hasOwnPassword, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { PageStatus, SelectField } from "@/shared/ui";

type NavKey = "institutions" | "members" | "reviews" | "subjects" | "pensums" | "groups";

const NAV: Array<{ key: NavKey; path: string; platformAdminOnly?: boolean }> = [
  { key: "institutions", path: "/admin/institutions", platformAdminOnly: true },
  { key: "members", path: "/admin/members" },
  { key: "reviews", path: "/admin/reviews" },
  { key: "subjects", path: "/admin/subjects" },
  { key: "pensums", path: "/admin/pensums" },
  { key: "groups", path: "/admin/groups" },
];

/**
 * Which institution the dashboard acts on. A Platform Admin picks any from a
 * list; an Institution Admin sees the one they entered and, if they belong to
 * several, a link back to the selector.
 */
function InstitutionContext({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  const locale = useLocale();
  const { admin } = useDictionary();
  const { institutions, active, select } = useActiveInstitution();
  if (!active) {
    return null;
  }
  if (isPlatformAdmin) {
    return (
      <SelectField
        label={admin.institutionSwitcher.label}
        value={active.id}
        onChange={(event) => select(event.target.value)}
        options={institutions.map((institution) => ({
          value: institution.id,
          label: institution.name,
        }))}
      />
    );
  }
  return (
    <div className="text-sm">
      <p className="text-muted">{admin.institutionSwitcher.label}</p>
      <p className="font-medium" data-testid="active-institution">
        {active.name}
      </p>
      {institutions.length > 1 && (
        <Link
          href={localizedPath(locale, "/select-institution")}
          className="mt-1 inline-block font-medium text-brand"
        >
          {admin.institutionSwitcher.change}
        </Link>
      )}
    </div>
  );
}

/**
 * Frame of the admin dashboard. It keeps non-admins out of the pages, but that
 * is a convenience: every admin request is authorized again by the backend.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const session = useSession();
  const institution = useActiveInstitution();
  const { admin, common } = useDictionary();
  const user = session.user;
  // Until the institutions are known, there is no telling which role applies
  const isDeciding = user !== null && hasOwnPassword(user) && institution.isLoading;
  const isAllowed =
    user !== null &&
    hasOwnPassword(user) &&
    user.status === "ACTIVE" &&
    canAccessAdmin(user, institution.active?.id ?? null);

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    } else if (session.status === "authenticated" && !isDeciding && !isAllowed) {
      router.replace("/");
    }
  }, [session.status, isDeciding, isAllowed, router]);

  if (!user || isDeciding || !isAllowed) {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const links = NAV.filter((item) => !item.platformAdminOnly || user.isPlatformAdmin);
  const linkClass = (isCurrent: boolean) =>
    cn(
      "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
      isCurrent ? "bg-brand text-on-brand" : "text-foreground hover:bg-surface-muted",
    );
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:py-10">
      <aside className="flex shrink-0 flex-col gap-6 md:w-60">
        <div>
          <p className="text-sm font-semibold tracking-tight text-brand">{common.brand}</p>
          <p className="mt-1 text-lg font-semibold">{admin.title}</p>
          <p className="break-all text-sm text-muted">{user.email}</p>
        </div>
        <InstitutionContext isPlatformAdmin={user.isPlatformAdmin} />
        <nav aria-label={admin.nav.label}>
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {links.map((item) => {
              const href = localizedPath(locale, item.path);
              const isCurrent = pathname === href;
              return (
                <li key={item.key}>
                  <Link
                    href={href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={linkClass(isCurrent)}
                  >
                    {admin.nav[item.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 md:mt-auto">
          <Link href={localizedPath(locale, "/settings")} className="text-sm font-medium text-brand">
            {admin.nav.settings}
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

/** Renders its children with the active institution, or explains why there is none. */
export function WithActiveInstitution({ children }: { children(institutionId: string): ReactNode }) {
  const { admin, common } = useDictionary();
  const { active, isLoading } = useActiveInstitution();
  if (isLoading && !active) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  if (!active) {
    return <p className="text-sm text-muted">{admin.institutionSwitcher.none}</p>;
  }
  return <>{children(active.id)}</>;
}

/** Heading for a panel inside an admin page. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
