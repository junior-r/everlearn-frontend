# Virtual classroom

## The Need

Teachers and Students need a screen to hold a class: see each other, write in a chat and read live captions.

## The Goal

`/es/class/:sessionId` opens the class session's room for the assigned Teacher and the enrolled Students, and explains every way of not getting in or of dropping out.

## The Reason

- **`@livekit/components-react` for behaviour, our own markup for looks.** We use its room provider and hooks (`useTracks`, `useTrackToggle`, `useDataChannel`, `useConnectionState`) and its `VideoTrack`, but not its prefabs or stylesheet: their text is English-only and their theme is not ours. Every label comes from the dictionaries and every colour from the design tokens.
- **Chat and captions arrive as room data, published only by the video-server.** The browser sends a chat message to the video-server over HTTP with its room token and renders it when the room delivers it, like everyone else's. Packets sent by a participant are ignored.
- **The access is requested per visit and kept in memory.** Re-entering asks the backend again, so a member removed from a group cannot come back with an old token.

## The Implementation

- **Route:** `app/[lang]/class/[sessionId]/page.tsx` → `pages/classroom` (`ClassroomPage`): requests `POST /class-sessions/:id/token` for the active institution, then renders the widget.
- **`widgets/virtual-classroom`:** `VirtualClassroom` (connection and layout), `ParticipantTile`, `ClassControls`, `LiveCaptions`, `useRoomFeed` (chat and captions from the room), `lib/room-state.ts` (`closureFor`, `gridColumns`).
- **`features/classroom/send-chat-message`:** `ChatPanel`. **`features/classroom/enter-class`:** `MyClasses` on the home screen; a Teacher starts a class, everyone enters an open one. The list refreshes every 15 s.
- **`entities/class-session`:** types, API calls and the parsers of room messages.
- **States:** preparing (token) → connecting → in class (a "Reconectando…" notice while LiveKit recovers) → closed: `lost`, `failed`, `duplicate` (entered elsewhere) offer "Volver a entrar"; `ended` does not. A refused access shows the backend's reason (`NOT_CLASS_PARTICIPANT`, `CLASS_SESSION_NOT_FOUND`, `CLASS_SESSION_CLOSED`, `VIDEO_UNAVAILABLE`).
- **Devices:** a Teacher enters with microphone and camera on; a Student enters with both off. A device error shows a notice and keeps the viewer in class.
- **Config:** `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_VIDEO_SERVER_URL`.
- **E2E:** `e2e/classroom.spec.ts` needs the whole stack (`livekit`, `video-server`, `redis`, `backend`) and uses Chromium's fake camera and microphone.

## Known gaps

- No screen sharing, hand raising, or device picker.
- Chat and captions start when you enter: earlier messages are not loaded.
- No pre-join screen to check camera and microphone.
- On small screens the chat sits under the video at a fixed height.
