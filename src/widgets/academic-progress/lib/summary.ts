import type { CourseProgress } from "@/entities/evaluation";

export interface ProgressSummary {
  courses: number;
  /** Published evaluations across every course. */
  evaluations: number;
  graded: number;
  pending: number;
}

/**
 * Counts what a Student's courses hold. Only counting happens here: every
 * average shown on the page is the one the backend computed.
 */
export function summarize(courses: readonly CourseProgress[]): ProgressSummary {
  const evaluations = courses.flatMap((course) => course.evaluations);
  const graded = evaluations.filter((evaluation) => evaluation.grade !== null).length;
  return { courses: courses.length, evaluations: evaluations.length, graded, pending: evaluations.length - graded };
}
