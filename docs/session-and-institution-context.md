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
  - Platform Admin: starts on the first institution and switches from the admin sidebar.
- **Roles follow the choice.** `canAccessAdmin(user, active.id)` is true only where the user is an Institution Admin, so the same person is an admin in one institution and a student in another.
- **API calls** take the institution id explicitly and send it with `forInstitution(id)`.
- **Signing out** clears the choice.
- **Order of detours:** password change first, then institution selection. `/settings`, `/change-password` and `/login` never require an institution.

## Known gaps

- The choice is per browser, not per account, though a stored id the current user does not belong to is ignored.
- Pending members have no active memberships yet, so they never see the selector.
