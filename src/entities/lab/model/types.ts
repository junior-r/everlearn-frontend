import type { Tone } from "@/shared/lib/tone";

export const LAB_CATEGORIES = ["PHYSICS", "MATHS", "LANGUAGE"] as const;
export type LabCategory = (typeof LAB_CATEGORIES)[number];

/** Every lab of the catalogue, in the order the backend lists them. */
export const LAB_KEYS = [
  "gravity",
  "forces",
  "kinematics",
  "projectile",
  "function-grapher",
  "scientific-calculator",
  "equation-solver",
  "completions",
  "definitions",
] as const;
export type LabKey = (typeof LAB_KEYS)[number];

export type LanguageLabKey = "completions" | "definitions";

export const isLabKey = (value: unknown): value is LabKey =>
  typeof value === "string" && (LAB_KEYS as readonly string[]).includes(value);

export const isLanguageLab = (key: LabKey): key is LanguageLabKey => key === "completions" || key === "definitions";

/** Each category keeps its colour wherever a lab appears. */
export const categoryTone: Record<LabCategory, Tone> = {
  PHYSICS: "sky",
  MATHS: "grape",
  LANGUAGE: "coral",
};

export interface LabDefinition {
  key: LabKey;
  category: LabCategory;
}

/** A lab as a Platform Admin decides on it for one institution. */
export interface LabGrant extends LabDefinition {
  granted: boolean;
  enabled: boolean;
}

/** A granted lab as its Institution Admin switches it. */
export interface LabSetting extends LabDefinition {
  enabled: boolean;
}

export type Verdict = "CORRECT" | "ACCENTS" | "INCORRECT";

/** An exercise of a language lab, as its Teacher sees it: answers included. */
export interface LanguageExercise {
  id: string;
  labKey: LanguageLabKey;
  /** Null for the platform's own bank. */
  authorId: string | null;
  prompt: string;
  answers: string[];
  hint: string | null;
}

export interface TeacherExercises {
  builtIn: LanguageExercise[];
  own: LanguageExercise[];
}

export interface ExerciseInput {
  prompt: string;
  answers: string[];
  hint: string | null;
}

/** An exercise as a Student sees it before answering. */
export interface ExerciseQuestion {
  id: string;
  labKey: LanguageLabKey;
  prompt: string;
  hint: string | null;
}

export interface GivenAnswer {
  exerciseId: string;
  answer: string;
}

export interface MarkedAnswer extends GivenAnswer {
  verdict: Verdict;
}

export interface LabCourse {
  courseId: string;
  groupId: string;
  groupName: string;
  subjectId: string;
  subjectName: string;
}

export interface LabAssignment {
  id: string;
  labKey: LabKey;
  title: string;
  instructions: string | null;
  /** ISO date-time, or null without a due date. */
  dueAt: string | null;
  exerciseIds: string[];
  course: LabCourse;
  createdAt: string;
}

export interface AssignmentInput {
  labKey: LabKey;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  exerciseIds: string[];
}

export interface AssignmentSummary extends LabAssignment {
  submittedCount: number;
  studentCount: number;
}

/** What a Student handed in. Language activities carry a score; others are done, with a note. */
export interface LabAttempt {
  studentId: string;
  submittedAt: string;
  score: number | null;
  total: number | null;
  note: string | null;
  answers: MarkedAnswer[];
}

export interface MyAssignment extends LabAssignment {
  attempt: LabAttempt | null;
  late: boolean;
}

export interface MyAssignmentDetail {
  assignment: LabAssignment;
  questions: ExerciseQuestion[];
  attempt: LabAttempt | null;
  /** Accepted answers, sent only once the activity was handed in. */
  solutions: Array<{ exerciseId: string; answers: string[] }> | null;
}

export interface ResultRow {
  student: { membershipId: string; firstName: string; lastName: string };
  attempt: LabAttempt | null;
  late: boolean;
}

export interface AssignmentResults {
  assignment: LabAssignment;
  exercises: LanguageExercise[];
  rows: ResultRow[];
}

export interface Submission {
  answers: GivenAnswer[];
  note: string | null;
}

export const MAX_ASSIGNMENT_TITLE_LENGTH = 120;
export const MAX_INSTRUCTIONS_LENGTH = 2000;
export const MAX_NOTE_LENGTH = 1000;
export const MAX_ASSIGNMENT_EXERCISES = 20;
export const MAX_PROMPT_LENGTH = 300;
export const MAX_ANSWER_LENGTH = 60;
export const MAX_ANSWERS = 5;
export const MAX_HINT_LENGTH = 120;
/** Where a completion exercise leaves its word out. */
export const BLANK = "___";

const CATEGORY_OF: Record<LabKey, LabCategory> = {
  gravity: "PHYSICS",
  forces: "PHYSICS",
  kinematics: "PHYSICS",
  projectile: "PHYSICS",
  "function-grapher": "MATHS",
  "scientific-calculator": "MATHS",
  "equation-solver": "MATHS",
  completions: "LANGUAGE",
  definitions: "LANGUAGE",
};

/** The category a lab belongs to. */
export const categoryOf = (key: LabKey): LabCategory => CATEGORY_OF[key];
