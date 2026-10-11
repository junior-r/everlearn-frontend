import { describe, expect, it } from "vitest";
import { notificationPath, type AppNotification } from "./types";

const notice = (type: AppNotification["type"], data: AppNotification["data"] = {}): AppNotification => ({
  id: "n",
  institutionId: "a",
  type,
  data,
  read: false,
  createdAt: "2026-10-11T12:00:00.000Z",
});

describe("notificationPath", () => {
  it("leads to what the notice is about", () => {
    expect(notificationPath(notice("EVALUATION_PUBLISHED"))).toBe("/progress");
    expect(notificationPath(notice("EVALUATION_DUE"))).toBe("/progress");
    expect(notificationPath(notice("WELCOME"))).toBe("/");
    expect(notificationPath(notice("CLASS_STARTING"))).toBe("/");
  });

  it("opens the conversation with whoever wrote", () => {
    expect(notificationPath(notice("DIRECT_MESSAGE", { senderId: "u 1" }))).toBe("/messages?with=u%201");
    expect(notificationPath(notice("DIRECT_MESSAGE"))).toBe("/messages");
  });
});
