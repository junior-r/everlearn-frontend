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
- **`features/guardians/link-guardian`:** `GuardianLinks`, on the admin Members page: the table of links and the form to add one. The Guardian and the Student are each found with `MemberPicker`, so the form never loads the members of the institution. Staff see it too.
- **`entities/member/MemberPicker`:** the one way to choose a member: `Autocomplete` (`shared/ui`) over `GET /members/search`, by name or document number, with the email and document shown to tell namesakes apart. `activeOnly` leaves out who cannot be chosen yet; `exclude` hides ids already taken. The admin Groups page (assign a Teacher, enroll a Student) and Availability page (which Teacher) use it; neither loads a member list, and Availability shows no grid until a Teacher is found.
- **`shared/ui/Autocomplete`:** an ARIA combobox for lists too long to load: it waits 250 ms after typing, aborts the request it replaces, ignores an answer to an older query, and is driven by arrow keys and Enter (which picks a match instead of submitting the form). Its wording comes in as `messages`, so it holds no text.
- **`widgets/ward-overview`:** `GuardianPortal`: ward tabs, summary cards, average per subject, weekly schedule by day, upcoming evaluations, recent attendance.
- **The Members table** (`pages/admin/MembersPage`) never loads the institution: it asks `GET /members/page` for 20 rows, again when the search (debounced), the role filter or the page (`Pagination`, `shared/ui`) changes.
- **A ward's tab lives in the address** (`/guardian?ward=<Student membership id>`): tabs replace the address, and a notice about a ward links to it, so the portal opens on that Student. An unknown id falls back to the first ward.
- **`widgets/dashboards`:** `GroupTeaching` (`/principal/groups/:groupId`, reached from a group's name in the dashboard), from `GET /analytics/academic/groups/:groupId`, which sends no Student data beyond a count: the Teacher and weekly hours of each subject, and the weekly timetable. `WeekTimetable` (`entities/schedule`) is the same read-only timetable the Guardian portal shows.
- **`widgets/dashboards`:** `AcademicDashboard`: cards (active groups, students, Teachers, attendance, subjects without a Teacher), the groups table, the busiest Teachers' weekly load, the pensums table.
- **`pages/dashboards`:** `GuardianPage`, `PrincipalPage`; routes `app/[lang]/guardian`, `app/[lang]/principal`.
- **Registration:** `registrableRoles` now offers "Representante" to Institution Admins and Staff, after "Estudiante", which stays the default.
- **E2E:** `e2e/roles.spec.ts`.

## Known gaps

- A Guardian's portal shows averages per subject, not each evaluation and its feedback.
- A Principal can open a group, but not a single Teacher's week across groups.
- The Availability page forgets the Teacher on a reload: the choice is not kept in the address.
- Neither portal has a phone-specific layout beyond the shared responsive grid.
