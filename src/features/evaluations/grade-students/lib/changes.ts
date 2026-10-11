import { parseScore, type Evaluation, type GradebookStudent, type GradeEntry } from "@/entities/evaluation";

/** What the Teacher typed and has not saved yet, by cell. */
export type Drafts = Readonly<Record<string, string>>;

export const cellKey = (evaluationId: string, enrollmentId: string) => `${evaluationId}:${enrollmentId}`;

export interface PendingChanges {
  /** The scores to store, grouped by the evaluation they belong to. */
  byEvaluation: Map<string, GradeEntry[]>;
  count: number;
  /** Cells whose text is not a score the evaluation accepts. */
  invalid: Set<string>;
}

/**
 * Compares what was typed with what is stored and returns only the cells that
 * really changed. `feedback` holds the comments typed, by cell; one counts only
 * where the cell has a score, since a comment belongs to a grade.
 */
export function pendingChanges(
  evaluations: Evaluation[],
  students: GradebookStudent[],
  drafts: Drafts,
  feedback: Drafts = {},
): PendingChanges {
  const changes: PendingChanges = { byEvaluation: new Map(), count: 0, invalid: new Set() };
  for (const evaluation of evaluations) {
    for (const student of students) {
      const key = cellKey(evaluation.id, student.enrollmentId);
      const typed = drafts[key];
      const comment = feedback[key];
      if (typed === undefined && comment === undefined) {
        continue;
      }
      const stored = student.grades.find((grade) => grade.evaluationId === evaluation.id);
      let score = stored?.score ?? null;
      if (typed !== undefined) {
        const parsed = parseScore(typed, evaluation.maxScore);
        if (parsed.kind === "invalid") {
          changes.invalid.add(key);
          continue;
        }
        score = parsed.kind === "valid" ? parsed.value : null;
      }
      const entry: GradeEntry = { enrollmentId: student.enrollmentId, score };
      const nextFeedback = comment === undefined ? undefined : comment.trim() || null;
      if (score !== null && nextFeedback !== undefined && nextFeedback !== (stored?.feedback ?? null)) {
        entry.feedback = nextFeedback;
      }
      if (score !== (stored?.score ?? null) || entry.feedback !== undefined) {
        const entries = changes.byEvaluation.get(evaluation.id) ?? [];
        changes.byEvaluation.set(evaluation.id, [...entries, entry]);
        changes.count += 1;
      }
    }
  }
  return changes;
}
