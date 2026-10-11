import { describe, expect, it } from "vitest";
import type { Evaluation, GradebookStudent } from "@/entities/evaluation";
import { cellKey, pendingChanges } from "./changes";

const evaluation = (id: string, maxScore = 20): Evaluation => ({
  id,
  title: id,
  type: "EXAM",
  weight: 50,
  maxScore,
  dueAt: null,
  isPublished: true,
});

const student = (
  enrollmentId: string,
  scores: Record<string, number> = {},
  feedback: string | null = null,
): GradebookStudent => ({
  enrollmentId,
  membershipId: enrollmentId,
  firstName: enrollmentId,
  lastName: "Prueba",
  average: null,
  gradedWeight: 0,
  grades: Object.entries(scores).map(([evaluationId, score]) => ({ evaluationId, score, feedback })),
});

const evaluations = [evaluation("exam"), evaluation("quiz", 10)];
const students = [student("grace", { exam: 15 }), student("linus")];

describe("pendingChanges", () => {
  it("has nothing to save while nothing was typed", () => {
    const changes = pendingChanges(evaluations, students, {});

    expect(changes.count).toBe(0);
    expect(changes.byEvaluation.size).toBe(0);
    expect(changes.invalid.size).toBe(0);
  });

  it("collects new and changed scores by evaluation", () => {
    const changes = pendingChanges(evaluations, students, {
      [cellKey("exam", "grace")]: "16,5",
      [cellKey("exam", "linus")]: "12",
      [cellKey("quiz", "linus")]: "9",
    });

    expect(changes.count).toBe(3);
    expect(changes.byEvaluation.get("exam")).toEqual([
      { enrollmentId: "grace", score: 16.5 },
      { enrollmentId: "linus", score: 12 },
    ]);
    expect(changes.byEvaluation.get("quiz")).toEqual([{ enrollmentId: "linus", score: 9 }]);
  });

  it("ignores a cell typed back to what is stored", () => {
    const changes = pendingChanges(evaluations, students, {
      [cellKey("exam", "grace")]: "15.0",
      [cellKey("exam", "linus")]: "  ",
    });

    expect(changes.count).toBe(0);
  });

  it("removes a stored score when its cell is emptied", () => {
    const changes = pendingChanges(evaluations, students, { [cellKey("exam", "grace")]: "" });

    expect(changes.byEvaluation.get("exam")).toEqual([{ enrollmentId: "grace", score: null }]);
  });

  it("flags scores the evaluation does not accept instead of saving them", () => {
    const changes = pendingChanges(evaluations, students, {
      [cellKey("quiz", "grace")]: "11",
      [cellKey("exam", "linus")]: "doce",
    });

    expect(changes.count).toBe(0);
    expect([...changes.invalid]).toEqual([cellKey("exam", "linus"), cellKey("quiz", "grace")]);
  });
});

describe("pendingChanges with feedback", () => {
  const key = cellKey("exam", "grace");

  it("saves a comment with the score already stored", () => {
    const changes = pendingChanges(evaluations, students, {}, { [key]: "  Buen trabajo  " });

    expect(changes.count).toBe(1);
    expect(changes.byEvaluation.get("exam")).toEqual([{ enrollmentId: "grace", score: 15, feedback: "Buen trabajo" }]);
  });

  it("saves a comment and a new score of one cell as a single change", () => {
    const changes = pendingChanges(evaluations, students, { [key]: "18" }, { [key]: "Mejoraste" });

    expect(changes.count).toBe(1);
    expect(changes.byEvaluation.get("exam")).toEqual([{ enrollmentId: "grace", score: 18, feedback: "Mejoraste" }]);
  });

  it("removes a stored comment that was emptied, and ignores one left as it was", () => {
    const commented = [student("grace", { exam: 15 }, "Bien")];

    expect(pendingChanges(evaluations, commented, {}, { [key]: " " }).byEvaluation.get("exam")).toEqual([
      { enrollmentId: "grace", score: 15, feedback: null },
    ]);
    expect(pendingChanges(evaluations, commented, {}, { [key]: "Bien " }).count).toBe(0);
  });

  it("drops a comment where there is no score to attach it to", () => {
    const withoutScore = pendingChanges(evaluations, students, {}, { [cellKey("exam", "linus")]: "Falta entregar" });
    const scoreRemoved = pendingChanges(evaluations, students, { [key]: "" }, { [key]: "Anulada" });

    expect(withoutScore.count).toBe(0);
    expect(scoreRemoved.byEvaluation.get("exam")).toEqual([{ enrollmentId: "grace", score: null }]);
  });
});
