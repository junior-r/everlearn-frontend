import { describe, expect, it } from "vitest";
import type { ClassroomCourse } from "@/entities/class-session";
import { hasNewlyOpenedClass } from "./opened-classes";

const course = (role: ClassroomCourse["role"], openSessionId: string | null): ClassroomCourse => ({
  groupId: "g-1",
  groupName: "1ro A",
  subject: { id: "s-1", code: "MAT", name: "Matemática" },
  teacher: null,
  role,
  openSessionId,
});

describe("hasNewlyOpenedClass", () => {
  it("is news when a class the Student attends opens", () => {
    expect(hasNewlyOpenedClass([course("STUDENT", null)], [course("STUDENT", "c-1")])).toBe(true);
  });

  it("is not news on the first load, nor while the same class stays open", () => {
    expect(hasNewlyOpenedClass(null, [course("STUDENT", "c-1")])).toBe(false);
    expect(hasNewlyOpenedClass([course("STUDENT", "c-1")], [course("STUDENT", "c-1")])).toBe(false);
  });

  it("is not news for the Teacher who opened it, nor when a class closes", () => {
    expect(hasNewlyOpenedClass([course("TEACHER", null)], [course("TEACHER", "c-1")])).toBe(false);
    expect(hasNewlyOpenedClass([course("STUDENT", "c-1")], [course("STUDENT", null)])).toBe(false);
  });
});
