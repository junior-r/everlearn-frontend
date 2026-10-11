# Dashboards

## The Need

The first screen after signing in was a form or a list. Each role needs to see where things stand before choosing what to do.

## The Goal

A dashboard per role, made of summary cards and at least one chart, on top of the backend's figures (`backend/docs/analytics.md`).

## The Reason

- **Charts are CSS, with no library.** A bar is a `div` with a width; `BarChart` and `ColumnChart` (`shared/ui/Charts.tsx`) are under a hundred lines and follow the design tokens and dark mode for free. A charting library would be the largest dependency of the app for five bars.
- **A chart is a list with every value written out.** Bars are decoration (`aria-hidden`); the label and the figure are text, so the chart reads the same on a screen reader, without colour, and in a test.
- **`/admin` is the dashboard, sections stay where they were.** An Institution Admin and a Platform Admin land on figures; Staff, who only register members, still go straight to that section. Being sent away from a section you may not open still leads to your first section, as before.
- **The browser only counts what it was given.** The Student's cards count evaluations (graded, pending); every average and percentage shown is the one the backend computed.
- **A dash where a figure is missing.** An attendance rate without records shows "—" with the reason under it, not a sentence in display type.

## The Implementation

- **Routes:** `/admin` (platform figures for a Platform Admin outside an institution, the institution's otherwise), `/teacher` (linked as "Panel docente" from the Teacher's home), `/progress` (the Student's grades, now opening with their summary).
- **`shared/ui`:** `StatGrid` + `StatCard` (a `<dl>` of figures; the grid fits as many cards per row as there is room for), `BarChart` (horizontal, for named things), `ColumnChart` (vertical, for a distribution). `shared/lib/chart-scale.ts` (`barLengths`) is the only maths.
- **`entities/dashboard`:** the response types and `fetchPlatformDashboard`, `fetchInstitutionDashboard`, `fetchTeacherDashboard`.
- **`widgets/dashboards`:** `PlatformDashboard`, `InstitutionDashboard`, `TeacherDashboard`. **`widgets/academic-progress`:** the Student's `Summary` and `lib/summary.ts` (`summarize`).
- **Access:** `hasAdminDashboard` (`entities/session`) decides who gets `/admin` itself; `PortalShell` hides `/teacher` from other roles. Both are conveniences: the endpoints authorize on their own.
- **Charts per role:** platform: members per institution and users by status; institution: attendance records by mark; Teacher: distribution of averages; Student: average per subject (scale fixed at 100).
- **Numbers** are formatted with `Intl.NumberFormat` and the active locale (`widgets/dashboards/lib/format.ts`).
- **E2E:** `e2e/dashboards.spec.ts`.

## Known gaps

- The platform and institution figures may be up to 30 seconds old (backend cache); there is no refresh button.
- No trends over time: every figure is "as of now".
- Principals have no dashboard; Guardians have none either.
- A Teacher who is also a Student sees both links on the home screen rather than one combined dashboard.
