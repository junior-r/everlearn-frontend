import { describe, expect, it } from "vitest";
import { groupByDay, type ScheduledClass } from "./types";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY"] as const;
const lesson = (dayOfWeek: string, startMinute: number, subjectName: string): ScheduledClass => ({
  dayOfWeek,
  startMinute,
  endMinute: startMinute + 45,
  groupName: "1ro A",
  subjectName,
  teacherName: null,
  room: null,
});

describe("groupByDay", () => {
  it("lists the days that have classes, in the order of the week, earliest class first", () => {
    const week = groupByDay(
      [lesson("WEDNESDAY", 600, "Historia"), lesson("MONDAY", 540, "Física"), lesson("MONDAY", 480, "Matemática")],
      DAYS,
    );

    expect(week.map(({ day, classes }) => [day, classes.map((entry) => entry.subjectName)])).toEqual([
      ["MONDAY", ["Matemática", "Física"]],
      ["WEDNESDAY", ["Historia"]],
    ]);
  });

  it("orders two classes at the same time by subject, the same way every time", () => {
    const [monday] = groupByDay([lesson("MONDAY", 480, "Química"), lesson("MONDAY", 480, "Arte")], DAYS);

    expect(monday.classes.map((entry) => entry.subjectName)).toEqual(["Arte", "Química"]);
  });

  it("leaves out days it was not asked about, and is empty without classes", () => {
    expect(groupByDay([lesson("SUNDAY", 480, "Matemática")], DAYS)).toEqual([]);
    expect(groupByDay([], DAYS)).toEqual([]);
  });
});
