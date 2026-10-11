# Evaluations, gradebook and calendar

## The Need

Teachers need a place to set the evaluations of a subject and grade their Students; Students need to see their grades and where they stand; both need to see what is due and when.

## The Goal

Three screens on top of the backend's evaluations module (`backend/docs/evaluations.md`): the Teacher's course page with its gradebook, the Student's grades, and a month calendar of due dates for both.

## The Reason

- **The server computes averages; the browser never does.** The gradebook and the Student's page show `average` and `gradedWeight` as received, and reload after every save, so the two can never disagree with the rule in the backend.
- **A comment opens under the Student's row, not in a modal.** The comment button beside each score expands one row with a text area, so the Teacher keeps the table in view and the columns keep their width. It is enabled only where the cell has a score, since a comment belongs to a grade, and is saved by the same button as the scores.
- **Deleting asks first, inline.** Only drafts show "Eliminar"; it opens a confirmation above the list instead of a browser dialog.
- **Scores are typed freely and saved together.** A gradebook is filled in rows or columns at a time, so cells are plain text fields (`inputMode="decimal"`, comma or point) and one button saves every changed cell. `pendingChanges` (pure, tested) decides which cells really changed, in score or comment, and which are invalid.
- **A calendar grid plus a list.** The grid shows the month at a glance; the list under it carries the details and is what a phone and a screen reader rely on, since a phone cell only fits a dot.
- **Dates and numbers through `Intl`, labels through the dictionaries.** Month and weekday names, dates and decimal marks follow the locale without adding text to translate.
- **`PortalShell` instead of the home card.** A gradebook does not fit a centred card; Teacher and Student pages beyond the home screen share one wide frame with a way back.

## The Implementation

- **Routes:** `/courses/:groupId/:subjectId/evaluations` (Teacher), `/progress` (Student), `/calendar` (both). The home screen links to them: "Evaluaciones" beside each subject a Teacher teaches, "Mis notas" and "Calendario de evaluaciones" in the navigation.
- **`entities/evaluation`:** types, the API calls, `parseScore` / `formatNumber` (`lib/scores.ts`) and the month maths (`lib/calendar.ts`, weeks start on Monday). `evaluationTypeTone` gives each kind of evaluation its colour.
- **`features/evaluations/manage-evaluations`:** the list of a course's evaluations with their weight bar, the create/edit form, the publish action and the delete action for drafts. The maximum score is locked once an evaluation has grades.
- **`features/evaluations/grade-students`:** `GradebookTable`, rows are enrolled Students and columns are published evaluations.
- **`widgets/academic-progress`**, **`widgets/evaluation-calendar`**, **`widgets/portal-shell`** and **`pages/evaluations`** compose the three screens.
- **Access:** `PortalShell` hides a page from roles it is not for; that is a convenience. The backend refuses anyone who is not the Teacher assigned to the course (`NOT_COURSE_TEACHER`).
- **Subject colour** is `toneFor(subject.code)`, the same in the calendar and the grades.

## Known gaps

- A published evaluation cannot be deleted or unpublished, as in the backend.
- Unsaved scores are lost when leaving the page; there is no warning.
- The calendar shows evaluations only, not classes from the timetable.
- Wide gradebooks scroll horizontally; the Student column stays in place.
