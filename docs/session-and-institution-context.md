# Session routing & institution context

## The Need

One person can belong to several institutions with different roles, and a new member must replace their temporary password before using the app.

## The Goal

Every screen knows which institution the session is acting in, and the two mandatory detours (change password, choose institution) cannot be skipped by any page.

## The Reason

- **One component owns the detours.** `SessionRouting` (in `src/app/providers`) watches the session and the current path. Pages do not each have to remember the rules.
- **The institution choice is a cookie, not server state.** It only records a UI preference between visits. The backend re-authorises every request against the `x-institution-id` header, so tampering with the cookie gains nothing.

## The Implementation

- **`ActiveInstitutionProvider`** (`entities/institution`) loads the institutions the user may enter and exposes `active`, `roles`, `needsSelection`, `select` and `clear`.
  - One institution: entered automatically.
  - Several: `needsSelection` is true until the user picks one on `/select-institution`.
  - Platform Admin: belongs to no institution, so none is implied. They work at platform level (only the Institutions section) until they press "Gestionar" on an institution; the sidebar then names it and offers "Volver a la plataforma".
- **Roles follow the choice.** `adminSections(user, active.id)` lists the dashboard sections for the role held there (Institution Admin: all of the institution's; Staff and Principals: Members only, the enrolment desk), so the same person is an admin in one institution and a student in another. `AdminShell` redirects away from a section the role does not include. `registrableRoles` decides which roles the member form offers.
- **API calls** take the institution id explicitly and send it with `forInstitution(id)`.
- **Signing out** clears the choice.
- **Order of detours:** password change first, then institution selection. `/settings`, `/change-password` and `/login` never require an institution.

## Known gaps

- The choice is per browser, not per account, though a stored id the current user does not belong to is ignored.
- Pending members have no active memberships yet, so they never see the selector.

## Password reset screens

- **`/forgot-password`** and **`/reset-password`** are open to anyone, like `/login`, and live in `pages/login` with their forms in `features/auth/reset-password`. The login screen links to the first.
- The reset token arrives after `#` in the address and is read with `useSyncExternalStore`, so the server-rendered page and the first client render agree. Without a token the screen explains itself and offers a new link.
- Both forms call the API with `skipAuth`, since nobody is signed in. After a reset the member signs in with the new password; they are not signed in automatically.
- **E2E:** `e2e/password-reset.spec.ts` reads the link from the backend's log, which needs `EMAIL_LOG_BODIES=true` (the default in `docker-compose.yml`).
