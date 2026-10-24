import type { ClassroomCourse } from "@/entities/class-session";

/**
 * Whether a class the member attends opened between two loads of their courses.
 * The first load announces nothing, and a class the member gives is never news to them.
 */
export function hasNewlyOpenedClass(before: ClassroomCourse[] | null, after: ClassroomCourse[]): boolean {
  if (before === null) {
    return false;
  }
  const known = new Set(before.flatMap((course) => (course.openSessionId ? [course.openSessionId] : [])));
  return after.some((course) => course.role === "STUDENT" && course.openSessionId && !known.has(course.openSessionId));
}
