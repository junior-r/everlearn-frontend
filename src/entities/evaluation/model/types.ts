import type { Tone } from "@/shared/lib/tone";

export const EVALUATION_TYPES = ["EXAM", "QUIZ", "ASSIGNMENT", "PROJECT", "PARTICIPATION"] as const;
export type EvaluationType = (typeof EVALUATION_TYPES)[number];

/** The colour that stands for each kind of evaluation everywhere it is shown. */
export const evaluationTypeTone: Record<EvaluationType, Tone> = {
  EXAM: "coral",
  QUIZ: "sun",
  ASSIGNMENT: "sky",
  PROJECT: "grape",
  PARTICIPATION: "mint",
};

/** The evaluations of a course can be worth at most this much together, in percent. */
export const MAX_TOTAL_WEIGHT = 100;
export const MAX_TITLE_LENGTH = 120;
export const MAX_FEEDBACK_LENGTH = 1000;

/** What a Teacher decides about an evaluation. `weight` is the percent of the course it is worth. */
export interface EvaluationInput {
  title: string;
  type: EvaluationType;
  weight: number;
  maxScore: number;
  /** ISO date-time, or null for no due date. */
  dueAt: string | null;
}

export interface Evaluation extends EvaluationInput {
  id: string;
  /** Students see an evaluation, and can be graded in it, only once it is published. */
  isPublished: boolean;
}

interface SubjectRef {
  id: string;
  code: string;
  name: string;
}

/** Where a Student stands in a course. */
export interface Standing {
  /** Percent of the graded work the Student earned, 0 to 100; null while nothing is graded. */
  average: number | null;
  /** Percent of the course the graded evaluations are worth together. */
  gradedWeight: number;
}

export interface GradebookStudent extends Standing {
  enrollmentId: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  grades: Array<{ evaluationId: string; score: number; feedback: string | null }>;
}

/** A course as its Teacher grades it. */
export interface Gradebook {
  groupId: string;
  groupName: string;
  subject: SubjectRef;
  /** Drafts included. */
  evaluations: Evaluation[];
  totalWeight: number;
  /** What is left of the 100% for new evaluations, as the backend counts it. */
  availableWeight: number;
  students: GradebookStudent[];
}

/** A score to store, or null to remove the one stored. */
export interface GradeEntry {
  enrollmentId: string;
  score: number | null;
  /** Left out to keep the feedback already given; null removes it. */
  feedback?: string | null;
}

export interface GradedEvaluation extends Evaluation {
  grade: { score: number; feedback: string | null; gradedAt: string } | null;
}

/** A course as one of its Students sees it. */
export interface CourseProgress extends Standing {
  groupId: string;
  groupName: string;
  subject: SubjectRef;
  teacher: { membershipId: string; firstName: string; lastName: string } | null;
  evaluations: GradedEvaluation[];
}

/** An evaluation with a due date, among everything the member teaches or attends. */
export interface CalendarEntry {
  id: string;
  title: string;
  type: EvaluationType;
  /** ISO date-time. */
  dueAt: string;
  isPublished: boolean;
  groupId: string;
  groupName: string;
  subject: SubjectRef;
  /** The member set it (Teacher) or must hand it in (Student). */
  role: "TEACHER" | "STUDENT";
}
