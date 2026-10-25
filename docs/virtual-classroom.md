# Virtual classroom

## The Need

Teachers and Students need a screen to hold a class: see each other, write in a chat and read live captions.

## The Goal

`/es/class/:sessionId` opens the class session's room for the assigned Teacher and the enrolled Students, and explains every way of not getting in or of dropping out.

## The Reason

- **`@livekit/components-react` for behaviour, our own markup for looks.** We use its room provider and hooks (`useTracks`, `useTrackToggle`, `useDataChannel`, `useConnectionState`) and its `VideoTrack`, but not its prefabs or stylesheet: their text is English-only and their theme is not ours. Every label comes from the dictionaries and every colour from the design tokens.
- **Chat and captions arrive as room data, published only by the video-server.** The browser sends a chat message to the video-server over HTTP with its room token and renders it when the room delivers it, like everyone else's. Packets sent by a participant are ignored. Room data only reaches who is in the room, so each time the viewer connects (a late join, a reload, a reconnection) `useRoomFeed` also asks the video-server for what it kept (`GET /feed`: the last 300 chat packets and 3 captions) and merges it by id with what arrives live (`withHistory`); a takedown seen live stays down. Without the replay the class goes on with what arrives live.
- **Everything a member does to the room goes through the video-server.** Raising a hand, silencing a Student, taking a chat message down and ending the class are HTTP calls with the room token, exactly like chat. The browser holds no LiveKit permission beyond publishing its own media, so a menu that does not offer an action is a courtesy: the video-server is what refuses it.
- **Hands and roles are participant attributes.** The role is signed into the access token by the backend and the hand is set by the video-server, so both reach late joiners with no extra message and neither can be forged.
- **Hands are taken in order.** The hand attribute is when it went up (milliseconds). `handQueue` (`entities/class-session`) orders the raised hands once per render of the classroom: each tile shows its turn, and the count in the header opens the list, where the Teacher lowers a hand or all of them. Ties fall back to the identity, so every viewer sees the same order.
- **The browser's own `<dialog>` and popover for the confirmation and the menus.** They give focus trapping, Escape, the top layer and closing on an outside click without a dependency (`Dialog`, `ContextMenu` in `shared/ui`).
- **The access is requested per visit and kept in memory.** Re-entering asks the backend again, so a member removed from a group cannot come back with an old token.

## The Implementation

- **Route:** `app/[lang]/class/[sessionId]/page.tsx` → `pages/classroom` (`ClassroomPage`): requests `POST /class-sessions/:id/token` for the active institution, then renders the widget.
- **`widgets/virtual-classroom`:** `VirtualClassroom` (connection and layout), `ParticipantTile`, `ClassControls`, `LiveCaptions`, `useRoomFeed` (chat, removals and captions from the room, with the replay), `lib/room-state.ts` (`closureFor`, `gridColumns`, `stageKey`, `unreadCount`).
- **Toolbar (`ClassControls`):** microphone and camera, each with the list of connected devices to choose from (`useMediaDeviceSelect`; LiveKit switches the published track in place), share screen (left out where the browser cannot; for the Teacher a menu that also shares a lab), raise hand, open or close the chat (with the count of unread messages) and leave. Each button's only text is what pressing it does now.
- **A shared lab** is state in the room metadata, drawn by every browser and given to late joiners; it takes the stage like a new screen. See `labs.md`.
- **Leaving always asks first.** A Student confirms. A Teacher chooses between "Solo salir" (the class stays open) and "Finalizar para todos" (`POST /class/end`: the room closes, every Student sees "La clase terminó" and attendance is taken).
- **Stopping a share asks first too** (`StopSharingDialog`): a screen through `useScreenShare`, a lab from the toolbar or its panel, since the class loses it at once and a lab loses its changes. Starting needs no confirmation, and the browser's own "Stop sharing" bar ends a screen share without asking.
- **Stage:** a shared screen, or the tile a viewer pins, is shown large with the others beside it. A screen that starts being shared takes the stage for everyone, over whatever each had pinned (`startedScreen`); a viewer may still pin something else afterwards, and that pin is their own.
- **Video quality (`lib/room-options.ts`):** `roomOptions(role)` sends the Teacher's camera at 720p in three layers and a Student's at 360p in two (a Student is mostly a small tile, sent from a home upload). A shared screen goes at 1080p with the `detail` hint, in VP9 with a VP8 copy for browsers that cannot decode it, and drops frames rather than sharpness on a slow link (`SCREEN_PUBLISH`), plus a 720p layer. Its sound is shared too, without voice processing and at a music bitrate: a tab in Chrome and Edge, a whole screen only on Windows and ChromeOS, never a single window, and nothing from Firefox or Safari; the member ticks "Share audio" in the browser's picker. With `adaptiveStream` each viewer receives the layer that fits the tile's size on their screen, so the stage is sharp and small tiles are cheap; `dynacast` stops encoding layers nobody watches. What a viewer finally gets is bounded by the sender's upload: if a browser reports `qualityLimitationReason: bandwidth` in `chrome://webrtc-internals`, the network (or the machine LiveKit runs on) is the limit, not these settings.
- **Connection:** a tile shows a signal icon, and says "conexión débil" or "sin conexión", only when LiveKit rates that participant's connection poor or lost, so a blurry picture can be told apart from a bad link.
- **Zoom (`lib/zoom.ts`, `model/use-zoom.ts`):** on the stage and in the grid, each viewer zooms a camera or a shared screen for themselves only (a CSS transform on their own video element; nothing is sent). Buttons on the tile, Ctrl + wheel or a trackpad pinch, a two-finger pinch, and a double click; once zoomed in, dragging moves the picture, which never leaves an edge inside the frame. The small tiles beside the stage do not zoom, and a tile goes back to 100% when it leaves the stage.
- **Menus:** right click (or the button in the corner, for touch and keyboard) on a participant's card pins it; for the Teacher it also silences that participant (their microphone and the sound of a screen they share) and lowers that hand. On a chat message a reader copies and replies, and the author and the Teacher can also take it down for everyone; a message taken down keeps its place as "Mensaje eliminado".
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

## Sounds

- **Need:** a member looking at another window misses that someone came in, wrote or raised a hand.
- **Goal:** short, soft cues for entering a class, someone else entering, a message from someone else, a class of theirs opening (a Student on the home screen) and, for the Teacher, a hand going up. Nothing the viewer does themselves makes a sound, and a replayed message makes none.
- **Reason:** the tones are generated with Web Audio (`shared/lib/sounds.ts`: a table of sine tones and `scheduleCue`), so there are no audio files to license or download. The switch and the volume (low, medium, high) are the viewer's own and stay in this browser (`shared/lib/sound-preferences.ts`, `localStorage`, read safely): they are a convenience, not a setting anyone else needs. `prefers-reduced-motion` is about motion, so it does not mute them.
- **Implementation:** `useClassroomSounds` (`widgets/virtual-classroom`) listens to the room; `SoundToggle` in the toolbar switches them and opens the volume menu; `MyClasses` plays `classStarted` when a refresh shows a newly opened class (`hasNewlyOpenedClass`). A browser allows sound only after the viewer interacted with the page, so a cue before that is skipped.

## Transcripts of past classes

- **Need:** captions are stored as the class goes on, but nobody could read them afterwards.
- **Goal:** `/courses/:groupId/:subjectId/transcripts`, reached from "Transcripciones" in "Mis clases" by the course's Teacher and the Students of its group: the classes that have a transcript (the latest first), what was said in the one chosen, with speaker and time, and a plain-text download.
- **Reason:** the file is built in the browser from what the backend sent (`transcriptText` in `entities/class-session`, saved with `shared/lib/download`), so the date in it follows the reader's locale and no second endpoint has to repeat the access rule. Plain text needs no guard against spreadsheet formulas.
- **Implementation:** `pages/classroom/CourseTranscriptsPage` with `features/classroom/read-transcript` (`TranscriptView`). Who may read is decided only by the backend (see `backend/docs/classroom.md`). E2E: `e2e/classroom.spec.ts`.

## Known gaps

- No picker for the speaker, and the device chosen is not remembered for the next class.
- A Teacher cannot remove a participant from the class, and a microphone silenced by the Teacher can be opened again by its owner.
- A reply is a mention typed into the field, not a thread.
- The roll has no field for the note the backend accepts with a mark, and the class it shows is not kept in the address.
- No pre-join screen to check camera and microphone.
- On small screens the chat sits under the video at a fixed height.
