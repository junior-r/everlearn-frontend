import { apiClient, forInstitution } from "@/shared/api";
import type {
  CalendarEntry,
  CourseProgress,
  Evaluation,
  EvaluationInput,
  Gradebook,
  GradeEntry,
} from "./model/types";

export { dayKey, groupByDay, monthGrid, monthOf, monthRange, shiftMonth } from "./lib/calendar";
export type { YearMonth } from "./lib/calendar";
export { formatDateTime, formatNumber, fromDateTimeLocal, parseScore, toDateTimeLocal } from "./lib/scores";
export type { ParsedScore } from "./lib/scores";
export {
  EVALUATION_TYPES,
  evaluationTypeTone,
  MAX_FEEDBACK_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_TOTAL_WEIGHT,
} from "./model/types";
export type {
  CalendarEntry,
  CourseProgress,
  Evaluation,
  EvaluationInput,
  EvaluationType,
  Gradebook,
  GradebookStudent,
  GradedEvaluation,
  GradeEntry,
  Standing,
} from "./model/types";

/** Where the evaluations of one subject of one group live in the app. */
export const courseEvaluationsPath = (groupId: string, subjectId: string) =>
  `/courses/${groupId}/${subjectId}/evaluations`;

const coursePath = (groupId: string, subjectId: string) => `/groups/${groupId}/courses/${subjectId}`;

/** A course as its Teacher grades it. Only the Teacher assigned to it may ask. */
export function fetchGradebook(institutionId: string, groupId: string, subjectId: string): Promise<Gradebook> {
  return apiClient.request<Gradebook>(`${coursePath(groupId, subjectId)}/gradebook`, {
    headers: forInstitution(institutionId),
  });
}

export function createEvaluation(
  institutionId: string,
  groupId: string,
  subjectId: string,
  body: EvaluationInput,
): Promise<Evaluation> {
  return apiClient.request<Evaluation>(`${coursePath(groupId, subjectId)}/evaluations`, {
    method: "POST",
    body,
    headers: forInstitution(institutionId),
  });
}

export function updateEvaluation(
  institutionId: string,
  evaluationId: string,
  body: Partial<EvaluationInput>,
): Promise<Evaluation> {
  return apiClient.request<Evaluation>(`/evaluations/${evaluationId}`, {
    method: "PATCH",
    body,
    headers: forInstitution(institutionId),
  });
}

/** Makes an evaluation visible to its Students and open to grading. */
export function publishEvaluation(institutionId: string, evaluationId: string): Promise<Evaluation> {
  return apiClient.request<Evaluation>(`/evaluations/${evaluationId}/publish`, {
    method: "POST",
    headers: forInstitution(institutionId),
  });
}

/** Removes a draft; the backend refuses a published evaluation. */
export function deleteEvaluation(institutionId: string, evaluationId: string): Promise<void> {
  return apiClient.request<void>(`/evaluations/${evaluationId}`, {
    method: "DELETE",
    headers: forInstitution(institutionId),
  });
}

/** Stores scores in one evaluation; the backend stores all of them or none. */
export function saveGrades(institutionId: string, evaluationId: string, grades: GradeEntry[]): Promise<void> {
  return apiClient.request<void>(`/evaluations/${evaluationId}/grades`, {
    method: "PUT",
    body: { grades },
    headers: forInstitution(institutionId),
  });
}

/** The signed-in Student's courses with their evaluations, grades and averages. */
export function fetchMyProgress(institutionId: string): Promise<CourseProgress[]> {
  return apiClient.request<CourseProgress[]>("/evaluations/progress", {
    headers: forInstitution(institutionId),
  });
}

/** Evaluations due in a range across everything the member teaches and attends, soonest first. */
export function fetchDueEvaluations(institutionId: string, from: Date, to: Date): Promise<CalendarEntry[]> {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiClient.request<CalendarEntry[]>(`/evaluations/calendar?${query}`, {
    headers: forInstitution(institutionId),
  });
}
