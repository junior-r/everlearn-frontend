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
    expect(notificationPath(notice("GRADE_POSTED"))).toBe("/progress");
    expect(notificationPath(notice("WELCOME"))).toBe("/");
    expect(notificationPath(notice("CLASS_STARTING"))).toBe("/");
  });

  it("takes a Guardian to the ward a notice is about, or to their portal when it does not say", () => {
    for (const type of ["WARD_EVALUATION_PUBLISHED", "WARD_GRADE_POSTED", "WARD_ATTENDANCE"] as const) {
      expect(notificationPath(notice(type, { studentId: "m 1", studentName: "Grace Hopper" }))).toBe(
        "/guardian?ward=m%201",
      );
      expect(notificationPath(notice(type, { studentName: "Grace Hopper" }))).toBe("/guardian");
    }
  });

  it("opens the conversation with whoever wrote", () => {
    expect(notificationPath(notice("DIRECT_MESSAGE", { senderId: "u 1" }))).toBe("/messages?with=u%201");
    expect(notificationPath(notice("DIRECT_MESSAGE"))).toBe("/messages");
  });
});
