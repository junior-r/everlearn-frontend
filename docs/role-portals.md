# Guardian portal and Principal dashboard

## The Need

Guardians and Principals could sign in and found nothing: the home screen is built around a Teacher's and a Student's classes.

## The Goal

Each lands on a screen of their own: a Guardian on the Students they answer for (`/guardian`), a Principal on the teaching of the institution (`/principal`). The office gets the screen to link Guardians to Students.

## The Reason

- **The home screen sends them on.** `landingPath` (`entities/session`) decides: a Principal goes to `/principal`, someone who is only a Guardian to `/guardian`. Teachers and Students stay on the home screen, where starting a class is one tap away; a Teacher who is also a Guardian gets a link instead.
- **A landing page cannot offer a way back.** `PortalShell` with `isLanding` shows the account links and sign-out where other pages show "Volver al inicio", which would only bounce.
- **A Principal reads; they do not administer.** Their dashboard uses the read-only academic overview. The admin dashboard and its forms stay closed to them, as before.
- **One ward at a time.** Wards are tabs; each tab renders its own panel, keyed by the Student, so one Student's figures are never shown under another's name while loading.
- **The same building blocks as the other dashboards:** `StatCard`, `BarChart`, `DataTable`, `Section`. No average or rate is computed in the browser.

## The Implementation

- **`entities/guardian`:** types, the API calls, `groupByDay` (a week's classes in timetable order). **`entities/dashboard`:** `fetchAcademicOverview`.
- **`features/guardians/link-guardian`:** `GuardianLinks`, on the admin Members page: the table of links and the form to add one (Guardian, Student, relationship). Staff see it too.
- **`widgets/ward-overview`:** `GuardianPortal`: ward tabs, summary cards, average per subject, weekly schedule by day, upcoming evaluations, recent attendance.
- **`widgets/dashboards`:** `AcademicDashboard`: cards (active groups, students, Teachers, attendance, subjects without a Teacher), the groups table, the busiest Teachers' weekly load, the pensums table.
- **`pages/dashboards`:** `GuardianPage`, `PrincipalPage`; routes `app/[lang]/guardian`, `app/[lang]/principal`.
- **Registration:** `registrableRoles` now offers "Representante" to Institution Admins and Staff, after "Estudiante", which stays the default.
- **E2E:** `e2e/roles.spec.ts`.

## Known gaps

- A Guardian's portal shows averages per subject, not each evaluation and its feedback.
- A Principal cannot open a single group's timetable or a Teacher's schedule from the dashboard; they see totals.
- The link form lists every Guardian and Student of the institution in two plain selects, which will not scale to a large school.
- Neither portal has a phone-specific layout beyond the shared responsive grid.
