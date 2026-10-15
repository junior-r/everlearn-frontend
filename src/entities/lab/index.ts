import { apiClient, forInstitution } from "@/shared/api";
import type {
  AssignmentInput,
  AssignmentResults,
  AssignmentSummary,
  ExerciseInput,
  ExerciseQuestion,
  GivenAnswer,
  LabAssignment,
  LabAttempt,
  LabDefinition,
  LabGrant,
  LabKey,
  LabSetting,
  LanguageExercise,
  LanguageLabKey,
  MarkedAnswer,
  MyAssignment,
  MyAssignmentDetail,
  Submission,
  TeacherExercises,
} from "./model/types";

export {
  decodeLabState,
  encodeLabState,
  LABS_ATTRIBUTE,
  parseShareableLabs,
  parseSharedLab,
} from "./lib/shared-lab";
export type { SharedLab } from "./lib/shared-lab";
export {
  BLANK,
  categoryOf,
  categoryTone,
  isLabKey,
  isLanguageLab,
  LAB_CATEGORIES,
  LAB_KEYS,
  MAX_ANSWER_LENGTH,
  MAX_ANSWERS,
  MAX_ASSIGNMENT_EXERCISES,
  MAX_ASSIGNMENT_TITLE_LENGTH,
  MAX_HINT_LENGTH,
  MAX_INSTRUCTIONS_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PROMPT_LENGTH,
} from "./model/types";
export type {
  AssignmentInput,
  AssignmentResults,
  AssignmentSummary,
  ExerciseInput,
  ExerciseQuestion,
  GivenAnswer,
  LabAssignment,
  LabAttempt,
  LabCategory,
  LabDefinition,
  LabGrant,
  LabKey,
  LabSetting,
  LanguageExercise,
  LanguageLabKey,
  MarkedAnswer,
  MyAssignment,
  MyAssignmentDetail,
  ResultRow,
  Submission,
  TeacherExercises,
  Verdict,
} from "./model/types";
export { formatQuantity } from "./lib/format";
export { isFields, numberIn, oneOf, runOf, textOf } from "./lib/state-fields";
export type { Fields } from "./lib/state-fields";
export type {
  LabLookup,
  LabMode,
  LabModule,
  LabRenderProps,
  LabRunner,
  LabState,
  LabViewProps,
} from "./model/lab-module";
export { ExercisePrompt } from "./ui/ExercisePrompt";
export { LabIcon } from "./ui/LabIcon";
export { LabStage, Readings } from "./ui/LabStage";
export type { Reading } from "./ui/LabStage";
export { VerdictNote } from "./ui/VerdictNote";

/** Where a lab opens on its own. */
export const labPath = (labKey: LabKey) => `/labs/${labKey}`;
/** Where a Student works on a lab activity. */
export const labActivityPath = (assignmentId: string) => `/labs/activities/${assignmentId}`;
/** Where a Teacher gives and follows the lab activities of one subject of one group. */
export const courseLabsPath = (groupId: string, subjectId: string) => `/courses/${groupId}/${subjectId}/labs`;

const as = (institutionId: string) => ({ headers: forInstitution(institutionId) });

/** The labs the member may open in the institution, in catalogue order. */
export function fetchAvailableLabs(institutionId: string): Promise<LabDefinition[]> {
  return apiClient.request<LabDefinition[]>("/labs", as(institutionId));
}

/** The whole catalogue with what the platform granted an institution. Platform Admins only. */
export function fetchLabGrants(institutionId: string): Promise<LabGrant[]> {
  return apiClient.request<LabGrant[]>(`/institutions/${institutionId}/labs`);
}

export function setLabGrant(institutionId: string, labKey: LabKey, granted: boolean): Promise<void> {
  return apiClient.request<void>(`/institutions/${institutionId}/labs/${labKey}`, {
    method: "PUT",
    body: { granted },
  });
}

/** The labs granted to the institution, with their switch. Institution Admins (and Platform Admins inside it). */
export function fetchLabSettings(institutionId: string): Promise<LabSetting[]> {
  return apiClient.request<LabSetting[]>("/labs/settings", as(institutionId));
}

export function setLabEnabled(institutionId: string, labKey: LabKey, enabled: boolean): Promise<void> {
  return apiClient.request<void>(`/labs/${labKey}/enabled`, {
    method: "PUT",
    body: { enabled },
    ...as(institutionId),
  });
}

/** The bank's exercises of a language lab and the Teacher's own, answers included. */
export function fetchTeacherExercises(institutionId: string, labKey: LanguageLabKey): Promise<TeacherExercises> {
  return apiClient.request<TeacherExercises>(`/labs/${labKey}/exercises`, as(institutionId));
}

export function createExercise(
  institutionId: string,
  labKey: LanguageLabKey,
  body: ExerciseInput,
): Promise<LanguageExercise> {
  return apiClient.request<LanguageExercise>(`/labs/${labKey}/exercises`, {
    method: "POST",
    body,
    ...as(institutionId),
  });
}

export function updateExercise(institutionId: string, exerciseId: string, body: ExerciseInput): Promise<LanguageExercise> {
  return apiClient.request<LanguageExercise>(`/lab-exercises/${exerciseId}`, {
    method: "PATCH",
    body,
    ...as(institutionId),
  });
}

/** Removes one of the Teacher's exercises from their list; activities that hold it keep it. */
export function archiveExercise(institutionId: string, exerciseId: string): Promise<void> {
  return apiClient.request<void>(`/lab-exercises/${exerciseId}`, { method: "DELETE", ...as(institutionId) });
}

/** The bank's exercises of a language lab to practise with, without their answers. */
export function fetchPracticeSet(institutionId: string, labKey: LanguageLabKey): Promise<ExerciseQuestion[]> {
  return apiClient.request<ExerciseQuestion[]>(`/labs/${labKey}/practice`, as(institutionId));
}

/** Marks practice answers; nothing is stored and no answer is given away. */
export function checkPractice(
  institutionId: string,
  labKey: LanguageLabKey,
  answers: GivenAnswer[],
): Promise<MarkedAnswer[]> {
  return apiClient.request<MarkedAnswer[]>(`/labs/${labKey}/practice`, {
    method: "POST",
    body: { answers },
    ...as(institutionId),
  });
}

const courseActivities = (groupId: string, subjectId: string) =>
  `/groups/${groupId}/courses/${subjectId}/lab-assignments`;

export function createLabAssignment(
  institutionId: string,
  groupId: string,
  subjectId: string,
  body: AssignmentInput,
): Promise<LabAssignment> {
  return apiClient.request<LabAssignment>(courseActivities(groupId, subjectId), {
    method: "POST",
    body,
    ...as(institutionId),
  });
}

/** The activities of a course, newest first, with how many Students handed each in. Its Teacher only. */
export function fetchCourseLabAssignments(
  institutionId: string,
  groupId: string,
  subjectId: string,
): Promise<AssignmentSummary[]> {
  return apiClient.request<AssignmentSummary[]>(courseActivities(groupId, subjectId), as(institutionId));
}

export function fetchAssignmentResults(institutionId: string, assignmentId: string): Promise<AssignmentResults> {
  return apiClient.request<AssignmentResults>(`/lab-assignments/${assignmentId}/results`, as(institutionId));
}

export function deleteLabAssignment(institutionId: string, assignmentId: string): Promise<void> {
  return apiClient.request<void>(`/lab-assignments/${assignmentId}`, { method: "DELETE", ...as(institutionId) });
}

/** The signed-in Student's activities, the soonest due first. */
export function fetchMyLabAssignments(institutionId: string): Promise<MyAssignment[]> {
  return apiClient.request<MyAssignment[]>("/lab-assignments/mine", as(institutionId));
}

export function fetchMyLabAssignment(institutionId: string, assignmentId: string): Promise<MyAssignmentDetail> {
  return apiClient.request<MyAssignmentDetail>(`/lab-assignments/${assignmentId}`, as(institutionId));
}

/** Hands an activity in, once; the backend scores a language activity. */
export function submitLabAttempt(institutionId: string, assignmentId: string, body: Submission): Promise<LabAttempt> {
  return apiClient.request<LabAttempt>(`/lab-assignments/${assignmentId}/attempt`, {
    method: "POST",
    body,
    ...as(institutionId),
  });
}
