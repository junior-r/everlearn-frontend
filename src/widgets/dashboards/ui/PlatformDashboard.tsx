"use client";

import { BuildingsIcon, IdentificationCardIcon, UserCheckIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { fetchPlatformDashboard } from "@/entities/dashboard";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { TONES } from "@/shared/lib/tone";
import { useResource } from "@/shared/lib/use-resource";
import { BarChart, ErrorNotice, StatCard, StatGrid } from "@/shared/ui";
import { countFormatter } from "../lib/format";

/** The whole platform at a glance, for a Platform Admin who has not entered an institution. */
export function PlatformDashboard() {
  const { common, dashboard, errors } = useDictionary();
  const text = dashboard.platform;
  const count = countFormatter(useLocale());
  const figures = useResource(fetchPlatformDashboard);
  const data = figures.data;

  if (!data) {
    return figures.error ? (
      <ErrorNotice message={errorMessage(errors, figures.error)} />
    ) : (
      <p className="text-sm text-muted">{common.loading}</p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <StatGrid label={text.summary}>
        <StatCard
          label={text.activeInstitutions}
          value={count(data.activeInstitutions)}
          hint={format(text.inactiveHint, { count: count(data.inactiveInstitutions) })}
          icon={BuildingsIcon}
          tone="sky"
        />
        <StatCard label={text.totalUsers} value={count(data.totalUsers)} icon={UsersThreeIcon} tone="grape" />
        <StatCard
          label={text.activeUsers}
          value={count(data.usersByStatus.active)}
          icon={UserCheckIcon}
          tone="mint"
        />
        <StatCard
          label={text.pendingIdentity}
          value={count(data.usersByStatus.pendingOnboarding)}
          hint={text.pendingIdentityHint}
          icon={IdentificationCardIcon}
          tone="sun"
        />
      </StatGrid>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <BarChart
          title={text.largestTitle}
          hint={text.largestHint}
          emptyText={text.largestEmpty}
          bars={data.largestInstitutions.map((institution, index) => ({
            label: institution.name,
            value: institution.members,
            display: count(institution.members),
            tone: TONES[index % TONES.length],
          }))}
        />
        <BarChart
          title={text.statusTitle}
          hint={text.statusHint}
          emptyText={text.statusEmpty}
          bars={[
            { label: text.status.active, value: data.usersByStatus.active, tone: "mint" as const },
            { label: text.status.pendingOnboarding, value: data.usersByStatus.pendingOnboarding, tone: "sun" as const },
            { label: text.status.suspended, value: data.usersByStatus.suspended, tone: "coral" as const },
          ].map((bar) => ({ ...bar, display: count(bar.value) }))}
        />
      </div>
    </div>
  );
}
