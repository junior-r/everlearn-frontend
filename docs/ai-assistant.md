# AI assistant widget

## The Need

Members need a way to ask the assistant a question from wherever they are, without leaving the screen they are working on.

## The Goal

A floating button in the bottom corner of every screen opens "Asistente de IA": a chat that streams answers from the backend (`backend/docs/ai-assistant.md`).

## The Reason

- **Mounted once, in `AppProviders`.** It sits beside the pages, not inside them, so it is on the admin dashboard, the Teacher and Student home and their other pages without each page adding it, and the conversation survives moving between them.
- **The history lives in memory only.** It holds grades and names; nothing is written to `localStorage`. Reloading the page, signing out or entering another institution starts a new conversation (the widget is keyed by member and institution).
- **The answer is rendered as it arrives.** `apiClient.requestStream` reuses the token and refresh logic of every other call and `readEventStream` parses the Server-Sent Events; the state is a pure reducer (`conversationReducer`), which is where the tests are.
- **The backend decides everything about access.** The widget only chooses whether to show itself and which hint and suggestions to display (`canUseAssistant`, `assistantAudiences`); those mirror the backend for convenience.
- **The button never covers the end of a page on a phone.** While the button is on screen, `globals.css` pads the body by `--assistant-clearance` below 48rem and the full-height shells use `min-h-page` (the viewport minus that band), so the corner under the content is always empty. A new full-height wrapper must use `min-h-page`, not `min-h-dvh`.
- **Answers are shown as plain text.** No Markdown renderer: nothing a model writes is ever interpreted as markup.

## The Implementation

- **`shared/api`:** `requestStream` on the API client, `readEventStream` (`event-stream.ts`).
- **`entities/assistant`:** types of the messages and stream events, `streamAssistantReply`, the limits (`MAX_MESSAGES`, `MAX_MESSAGE_LENGTH`), `canUseAssistant`, `assistantAudiences`.
- **`features/assistant/ask-assistant`:** `useAssistantChat` (history, sending, stopping, retrying), `model/conversation.ts` (reducer), `AssistantChat` (messages, suggestions, composer).
- **`widgets/ai-chat`:** `AIChatWidget` (when to show) and the floating button and panel.
- **States:** empty (greeting, what it can look up for the role, suggested questions) → "Pensando…" → "Consultando los datos…" while a tool runs → text streaming, with a stop button → idle. A failure shows the error from the dictionaries and, if no answer had started, "Reintentar".
- **Shown to:** a signed-in member with their own password who has entered an institution and holds a role other than Guardian there. Hidden on `/class/:sessionId`, which fills the screen and has its own chat in that corner.
- **Keyboard:** Enter sends, Shift+Enter adds a line, Escape closes and returns focus to the button.
- **Only the latest 30 messages** are sent with a question, which is what the backend accepts.
- **E2E:** `e2e/assistant.spec.ts` (needs `backend`; it runs against the built-in mock model). One test opens the Student, Teacher and admin pages at phone width and fails if the button overlaps any link, button or field at the end of a page.

## Known gaps

- Closing the tab loses the conversation, by design; there is no history across sessions.
- No Markdown, links or copy button in answers.
- While scrolling through a long page on a phone the button floats over the content passing under it; only the end of the page is guaranteed clear.
- The panel is a non-modal dialog: focus is not trapped inside it.
