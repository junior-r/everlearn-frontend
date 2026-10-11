export const GUARDIAN_RELATIONSHIPS = ["MOTHER", "FATHER", "LEGAL_GUARDIAN", "GRANDPARENT", "SIBLING", "OTHER"] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

interface PersonName {
  membershipId: string;
  firstName: string;
  lastName: string;
}

/** A Guardian tied to a Student of the same institution. */
export interface GuardianLink {
  id: string;
  student: PersonName;
  guardian: PersonName;
  relationship: GuardianRelationship;
}

/** A Student the Guardian answers for, with the groups they are enrolled in. */
export interface Ward extends PersonName {
  relationship: GuardianRelationship;
  groups: Array<{ id: string; name: string }>;
}

export interface ScheduledClass {
  dayOfWeek: string;
  /** Minutes from midnight, exclusive end. */
  startMinute: number;
  endMinute: number;
  groupName: string;
  subjectName: string;
  teacherName: string | null;
  room: string | null;
}

export interface WardCourse {
  groupName: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string | null;
  /** Percent, computed by the backend; null while nothing is graded. */
  average: number | null;
  gradedWeight: number;
  gradedEvaluations: number;
  publishedEvaluations: number;
}

export interface AttendanceEntry {
  /** ISO date-time of the class. */
  date: string;
  subjectName: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
}

export interface WardOverview {
  ward: Ward;
  schedule: ScheduledClass[];
  courses: WardCourse[];
  upcoming: Array<{ id: string; title: string; type: string; dueAt: string; subjectName: string; groupName: string }>;
  attendance: {
    counts: { present: number; late: number; absent: number; excused: number };
    /** Percent of the counted classes attended, computed by the backend; null without records. */
    rate: number | null;
    recent: AttendanceEntry[];
  };
}

/** A week's classes as a timetable reads: one entry per day that has any, in `days` order, earliest first. */
export function groupByDay<Day extends string>(
  schedule: readonly ScheduledClass[],
  days: readonly Day[],
): Array<{ day: Day; classes: ScheduledClass[] }> {
  return days
    .map((day) => ({
      day,
      classes: schedule
        .filter((entry) => entry.dayOfWeek === day)
        .sort((a, b) => a.startMinute - b.startMinute || a.subjectName.localeCompare(b.subjectName)),
    }))
    .filter(({ classes }) => classes.length > 0);
}
