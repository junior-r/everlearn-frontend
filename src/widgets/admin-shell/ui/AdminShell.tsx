"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { ActiveInstitutionProvider, useActiveInstitution } from "@/entities/institution";
import { administeredInstitutionIds, canAccessAdmin, useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth/logout";
import { localizedPath, useDictionary, useLocale, useLocalizedRouter } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { PageStatus, SelectField } from "@/shared/ui";

type NavKey = "institutions" | "subjects" | "members" | "reviews";

const NAV: Array<{ key: NavKey; path: string; platformAdminOnly?: boolean }> = [
  { key: "institutions", path: "/admin/institutions", platformAdminOnly: true },
  { key: "members", path: "/admin/members" },
  { key: "reviews", path: "/admin/reviews" },
  { key: "subjects", path: "/admin/subjects" },
];

function InstitutionSwitcher() {
  const { admin } = useDictionary();
  const { institutions, active, select } = useActiveInstitution();
  if (institutions.length === 0 || !active) {
    return null;
  }
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

/**
 * Frame of the admin dashboard. It keeps non-admins out of the pages, but that
 * is a convenience: every admin request is authorized again by the backend.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useLocalizedRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const session = useSession();
  const { admin, common } = useDictionary();
  const user = session.user;
  const isAllowed = user !== null && user.status === "ACTIVE" && canAccessAdmin(user);
  // Null lets a Platform Admin choose among all institutions
  const allowedIds = useMemo(
    () => (user && !user.isPlatformAdmin ? administeredInstitutionIds(user) : null),
    [user],
  );

  useEffect(() => {
    if (session.status === "anonymous") {
      router.replace("/login");
    } else if (session.status === "authenticated" && !isAllowed) {
      router.replace("/");
    }
  }, [session.status, isAllowed, router]);

  if (!user || !isAllowed) {
    return <PageStatus>{common.loading}</PageStatus>;
  }

  const links = NAV.filter((item) => !item.platformAdminOnly || user.isPlatformAdmin);
  return (
    <ActiveInstitutionProvider allowedIds={allowedIds}>
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:py-10">
        <aside className="flex shrink-0 flex-col gap-6 md:w-60">
          <div>
            <p className="text-sm font-semibold tracking-tight text-brand">{common.brand}</p>
            <p className="mt-1 text-lg font-semibold">{admin.title}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <InstitutionSwitcher />
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
                      className={cn(
                        "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
                        isCurrent ? "bg-brand text-on-brand" : "text-foreground hover:bg-surface-muted",
                      )}
                    >
                      {admin.nav[item.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="md:mt-auto">
            <LogoutButton />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </ActiveInstitutionProvider>
  );
}

/** Page heading plus, for institution-scoped pages, a prompt when no institution is selected yet. */
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
