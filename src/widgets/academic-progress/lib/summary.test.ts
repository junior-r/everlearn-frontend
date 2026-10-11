import { describe, expect, it } from "vitest";
import type { CourseProgress, GradedEvaluation } from "@/entities/evaluation";
import { summarize } from "./summary";

const evaluation = (id: string, score: number | null): GradedEvaluation => ({
  id,
  title: id,
  type: "EXAM",
  weight: 20,
  maxScore: 20,
  dueAt: null,
  isPublished: true,
  grade: score === null ? null : { score, feedback: null, gradedAt: "2026-10-01T12:00:00.000Z" },
});

const course = (code: string, evaluations: GradedEvaluation[]): CourseProgress => ({
  groupId: "g1",
  groupName: "1ro A",
  subject: { id: code, code, name: code },
  teacher: null,
  average: null,
  gradedWeight: 0,
  evaluations,
});

describe("summarize", () => {
  it("counts courses and their evaluations, graded and still pending", () => {
    const summary = summarize([
      course("MAT", [evaluation("a", 15), evaluation("b", null), evaluation("c", 0)]),
      course("HIS", [evaluation("d", null)]),
      course("ART", []),
    ]);

    // A zero is a grade
    expect(summary).toEqual({ courses: 3, evaluations: 4, graded: 2, pending: 2 });
  });

  it("is all zeros for a Student without courses", () => {
    expect(summarize([])).toEqual({ courses: 0, evaluations: 0, graded: 0, pending: 0 });
  });
});
