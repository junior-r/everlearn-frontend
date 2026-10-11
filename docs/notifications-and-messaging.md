# Notification bell, direct messages and gradebook export

## The Need

Members need to see what happened while they were elsewhere, write to each other, and Teachers need their grades outside the platform.

## The Goal

A bell on every signed-in screen, a `/messages` page with live conversations, and an "Exportar a CSV" button in the gradebook, on top of the backend described in `backend/docs/notifications-and-messaging.md`.

## The Reason

- **One live connection for the whole app.** `shared/api/realtime.ts` wraps Socket.io behind a small interface (`connect`, `on`, `setViewing`); `RealtimeConnection` opens it while someone is signed in. Features subscribe to events and never see the socket.
- **The socket only says "something changed".** The bell reloads its list, the messenger merges the pushed message into what it already loaded over HTTP. If the connection drops, a reload shows the same thing.
- **A notice is worded here.** The backend sends a type and facts; `notifications.types` in the dictionaries turns them into a title and a line, in the reader's language, with dates through `Intl`.
- **There is no global header, so the same block goes in each shell.** `HeaderActions` (the way to messages and the bell) sits in the admin navigation, in the top bar of `PortalShell` and on the home card.
- **The open conversation is in the address** (`/messages?with=<userId>`), so a notice can link to it and a reload keeps it.
- **The file is downloaded with the session, not with a link.** The export needs the access token, so the browser fetches it and saves the blob; the name is built here from the subject and the group.
- **The assistant's button stays off `/messages`.** It would sit on the send button, and the screen already is a chat.

## The Implementation

- **`shared/api`:** `realtime` (the single connection; renews the access token when the server refuses it), `apiClient.refresh()`. **`shared/lib`:** `timeAgo`, `saveBlob` / `fileName`.
- **`entities/notification`:** types, `fetchNotifications`, `markNotificationsRead`, `notificationPath` (where a notice leads). **`entities/message`:** types, the API calls, `mergeMessages` (in order, each once), `conversationKey`, `peerOf`.
- **`features/notifications/notification-bell`:** `NotificationBell`: unread count, the latest 20, mark one or all as read; closes on Escape or a click outside.
- **`features/messages/find-contact`** (search by name, after a pause in typing) and **`features/messages/send-message`** (`MessageThread`: the conversation and its composer; Enter sends, Shift+Enter adds a line).
- **`widgets/messenger`:** `Messenger`: conversations with their unread counts beside the open one; one pane at a time on a phone. While a conversation is open it tells the server so (`setViewing`), which is what suppresses the notice.
- **`widgets/header-actions`**, **`pages/messages`**, route `app/[lang]/messages`.
- **Gradebook:** "Exportar a CSV" in `GradebookTable` calls `downloadGradebook` with the active locale (Spanish files use `;` and decimal commas, as spreadsheets set to Spanish expect).
- **E2E:** `e2e/communication.spec.ts` (two browsers for the live parts).

## Known gaps

- A notice from another institution than the one entered opens in the current one; it does not switch institution.
- The messages link shows no unread count; unread messages show through the bell and inside the page.
- No typing indicator, read receipts, attachments, or deleting a message.
- The export contains saved grades only; unsaved cells are not in it.
- Nothing asks for the browser's permission to show system notifications; notices are in-app and by email.
