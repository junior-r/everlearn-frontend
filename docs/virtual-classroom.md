# Virtual classroom

## The Need

Teachers and Students need a screen to hold a class: see each other, write in a chat and read live captions.

## The Goal

`/es/class/:sessionId` opens the class session's room for the assigned Teacher and the enrolled Students, and explains every way of not getting in or of dropping out.

## The Reason

- **`@livekit/components-react` for behaviour, our own markup for looks.** We use its room provider and hooks (`useTracks`, `useTrackToggle`, `useDataChannel`, `useConnectionState`) and its `VideoTrack`, but not its prefabs or stylesheet: their text is English-only and their theme is not ours. Every label comes from the dictionaries and every colour from the design tokens.
- **Chat and captions arrive as room data, published only by the video-server.** The browser sends a chat message to the video-server over HTTP with its room token and renders it when the room delivers it, like everyone else's. Packets sent by a participant are ignored.
- **Everything a member does to the room goes through the video-server.** Raising a hand, silencing a Student, taking a chat message down and ending the class are HTTP calls with the room token, exactly like chat. The browser holds no LiveKit permission beyond publishing its own media, so a menu that does not offer an action is a courtesy: the video-server is what refuses it.
- **Hands and roles are participant attributes.** The role is signed into the access token by the backend and the hand is set by the video-server, so both reach late joiners with no extra message and neither can be forged.
- **The browser's own `<dialog>` and popover for the confirmation and the menus.** They give focus trapping, Escape, the top layer and closing on an outside click without a dependency (`Dialog`, `ContextMenu` in `shared/ui`).
- **The access is requested per visit and kept in memory.** Re-entering asks the backend again, so a member removed from a group cannot come back with an old token.

## The Implementation

- **Route:** `app/[lang]/class/[sessionId]/page.tsx` → `pages/classroom` (`ClassroomPage`): requests `POST /class-sessions/:id/token` for the active institution, then renders the widget.
- **`widgets/virtual-classroom`:** `VirtualClassroom` (connection and layout), `ParticipantTile`, `ClassControls`, `LiveCaptions`, `useRoomFeed` (chat, removals and captions from the room), `lib/room-state.ts` (`closureFor`, `gridColumns`, `stageKey`, `unreadCount`).
- **Toolbar (`ClassControls`):** microphone and camera, each with the list of connected devices to choose from (`useMediaDeviceSelect`; LiveKit switches the published track in place), share screen (left out where the browser cannot), raise hand, open or close the chat (with the count of unread messages) and leave. Each button's only text is what pressing it does now.
- **Leaving always asks first.** A Student confirms. A Teacher chooses between "Solo salir" (the class stays open) and "Finalizar para todos" (`POST /class/end`: the room closes, every Student sees "La clase terminó" and attendance is taken).
- **Stage:** a shared screen, or the tile a viewer pins, is shown large with the others beside it. A screen that starts being shared takes the stage for everyone, over whatever each had pinned (`startedScreen`); a viewer may still pin something else afterwards, and that pin is their own.
- **Video quality (`lib/room-options.ts`):** cameras are sent at 720p in three layers and a shared screen at 1080p with the `detail` hint (text stays sharp) plus a 720p layer. With `adaptiveStream` each viewer receives the layer that fits the tile's size on their screen, so the stage is sharp and small tiles are cheap; `dynacast` stops encoding layers nobody watches. What a viewer finally gets is bounded by the sender's upload: if a browser reports `qualityLimitationReason: bandwidth` in `chrome://webrtc-internals`, the network (or the machine LiveKit runs on) is the limit, not these settings.
- **Menus:** right click (or the button in the corner, for touch and keyboard) on a participant's card pins it; for the Teacher it also silences that microphone and lowers that hand. On a chat message a reader copies and replies, and the author and the Teacher can also take it down for everyone; a message taken down keeps its place as "Mensaje eliminado".
- **`features/classroom/send-chat-message`:** `ChatPanel`, `MessageRow`. **`features/classroom/enter-class`:** `MyClasses` on the home screen; a Teacher starts a class, everyone enters an open one. The list refreshes every 15 s.
- **`entities/class-session`:** types, API calls and the parsers of room messages.
- **States:** preparing (token) → connecting → in class (a "Reconectando…" notice while LiveKit recovers) → closed: `lost`, `failed`, `duplicate` (entered elsewhere) offer "Volver a entrar"; `ended` does not. A refused access shows the backend's reason (`NOT_CLASS_PARTICIPANT`, `CLASS_SESSION_NOT_FOUND`, `CLASS_SESSION_CLOSED`, `VIDEO_UNAVAILABLE`).
- **Devices:** a Teacher enters with microphone and camera on; a Student enters with both off. A device error shows a notice and keeps the viewer in class.
- **Config:** `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_VIDEO_SERVER_URL`.
- **E2E:** `e2e/classroom.spec.ts` needs the whole stack (`livekit`, `video-server`, `redis`, `backend`) and uses Chromium's fake camera, microphone and screen.

## Attendance by hand

- **Need:** a Teacher takes the roll of a class, given by video or in the classroom.
- **Goal:** `/courses/:groupId/:subjectId/attendance`, reached from "Asistencia" in "Mis clases": the course's classes, the roll of the one chosen (the latest by default), and a form to record a class given without video.
- **Reason:** the backend already told Guardians of an absence taken by hand; without a screen no Teacher could take one.
- **Implementation:** `pages/classroom/CourseAttendancePage` with `features/classroom/take-attendance` (`AttendanceSheet`, `RecordHeldClassForm`) over `entities/class-session`. The roll is a radio group per Student (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`); only marks that changed are sent, so a mark taken automatically stays automatic until the Teacher changes it. E2E: `e2e/communication.spec.ts`.

## Known gaps

- No picker for the speaker, and the device chosen is not remembered for the next class.
- A hand raised is shown and counted, but hands are not listed in the order they went up.
- A Teacher cannot remove a participant from the class, and a microphone silenced by the Teacher can be opened again by its owner.
- A reply is a mention typed into the field, not a thread.
- The roll has no field for the note the backend accepts with a mark, and the class it shows is not kept in the address.
- Chat and captions start when you enter: earlier messages are not loaded.
- No pre-join screen to check camera and microphone.
- On small screens the chat sits under the video at a fixed height.
