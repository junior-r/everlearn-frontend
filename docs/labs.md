# Labs

## The Need

Teachers and Students need hands-on tools: physics simulations, maths tools and language exercises, on their own, as activities a Teacher gives, and live in a class.

## The Goal

Nine labs in three categories (physics: free fall, forces on a ramp, speed and acceleration, projectile motion; maths: function grapher, scientific calculator, variable solver; language: completions, definitions) that a member opens from `/labs`, a Teacher gives as activities to a course, and a Teacher shares on the class's stage.

## The Reason

- **A lab is plain state plus a view.** Each lab is a `LabModule` (`entities/lab`): `initial()`, `parse(unknown)` and a `View` that draws the same thing from the same state in three modes: `standalone`, `presenter` (the Teacher in class) and `follower` (a Student in class, every control disabled). The same screen serves every use, and a state that came from the room or the address is always read through `parse`, which keeps every value in range.
- **Deterministic engines, no libraries.** Physics is closed form (`features/labs/physics/lib/physics.ts`): the same inputs give the same frame on every screen. Maths uses our own expression parser (`shared/lib/expression.ts`): it builds a tree and never runs code, so an expression typed by a Teacher is safe in a Student's browser; prototype names such as `constructor` are not known. Drawings are SVG with design tokens; animation is `usePlayback` (`requestAnimationFrame`, the end at once under reduced motion).
- **Shared in class as state, not video.** The Teacher's lab state goes to the video-server (`POST /lab`), which puts it in the room metadata; every browser draws it, sharp at any size, and a late joiner gets it on entering. Changes go through `createLatestSender` (`shared/lib/latest-sender.ts`): one request at a time, at most every 200 ms, always the newest state, in order. The browser never publishes data to the room.
- **The classroom does not know the labs.** `VirtualClassroom` receives `findLab` (`LabLookup`) from the page; `widgets/lab-workbench` holds the table of labs.
- **Language answers stay on the backend.** Practice sends answers to be marked and gets verdicts only; an activity shows the accepted answers after its single hand-in. In class the answers travel only when the Teacher reveals them.

## The Implementation

- **Pages:** `/labs` (catalogue by category and, for a Student, their activities), `/labs/:labKey` (a lab on its own; `?state=` opens what the class saw; a Teacher of a language lab also writes their own exercises there), `/labs/activities/:assignmentId` (a Student works and hands in), `/courses/:groupId/:subjectId/labs` (a Teacher gives activities and sees hand-ins; linked from "Mis clases"), `/admin/labs` (a Platform Admin grants, an Institution Admin switches).
- **Features (`features/labs`):** `physics`, `maths`, `language` (the labs), `assign-lab`, `follow-activities`, `hand-in-activity`, `manage-exercises`, `manage-lab-access`.
- **Entity (`entities/lab`):** types, API calls, the catalogue (`categoryOf`, `categoryTone`), `LabStage`/`Readings`/`LabIcon`/`ExercisePrompt`/`VerdictNote`, the shared-lab parsers (`parseSharedLab`, `parseShareableLabs`, `encodeLabState`).
- **Classroom:** the Teacher's share button is a menu (screen or lab, `ShareMenu`); the labs offered are those in the token's `labs` attribute. A shared lab takes the stage like a new screen (`LAB_STAGE_KEY`); a viewer may still pin someone else. `useSharedLab` drives it; a Teacher who re-enters takes up the lab they were sharing.
- **UI kit additions (`shared/ui`):** `RangeField`, `ChoiceGroup`, `Switch`.
- **Notices:** `LAB_ASSIGNED` opens the activity.
- **Tests:** engines, parser, sender and every lab's `parse` in unit tests; `e2e/labs.spec.ts` covers granting and switching, an activity from Teacher to Student and back, and sharing the grapher in class (needs `livekit` and `video-server`).

## Known gaps

- The Student's own copy of a shared lab is not saved anywhere: it lives in the address and the page.
- Language practice uses the platform's bank only; a Teacher's own exercises reach Students through activities and the class.
- Sliders send a value per step while dragged (throttled to one request every 200 ms).
