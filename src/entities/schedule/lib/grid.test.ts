import { describe, expect, it } from "vitest";
import {
  cellKey,
  cellsFromWindows,
  findInCell,
  formatTime,
  parseTime,
  startsInCell,
  windowsFromCells,
  type TimeRange,
} from "./grid";

const monday = (start: number, end: number): TimeRange => ({
  dayOfWeek: "MONDAY",
  startMinute: start,
  endMinute: end,
});

describe("time formatting", () => {
  it("formats minutes from midnight as a 24-hour time", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(510)).toBe("08:30");
    expect(formatTime(13 * 60 + 5)).toBe("13:05");
  });

  it("parses what a time input produces and rejects anything else", () => {
    expect(parseTime("08:30")).toBe(510);
    expect(parseTime("7:00")).toBe(420);
    expect(parseTime("24:00")).toBe(1440);
    for (const invalid of ["", "8", "08:60", "25:00", "24:01", "aa:bb", "08:30:00"]) {
      expect(parseTime(invalid)).toBeNull();
    }
  });

  it("round-trips", () => {
    for (const minutes of [0, 405, 510, 1439]) {
      expect(parseTime(formatTime(minutes))).toBe(minutes);
    }
  });
});

describe("availability grid", () => {
  it("joins consecutive selected hours of a day into one window", () => {
    const cells = new Set([
      cellKey("MONDAY", 8),
      cellKey("MONDAY", 9),
      cellKey("MONDAY", 10),
      cellKey("MONDAY", 14),
      cellKey("TUESDAY", 8),
    ]);

    expect(windowsFromCells(cells)).toEqual([
      monday(480, 660),
      monday(840, 900),
      { dayOfWeek: "TUESDAY", startMinute: 480, endMinute: 540 },
    ]);
  });

  it("produces no windows for an empty selection", () => {
    expect(windowsFromCells(new Set())).toEqual([]);
  });

  it("marks only the hours a window covers completely", () => {
    // 08:30–11:00 covers the 9 and 10 o'clock cells, but only half of the 8 o'clock one
    const cells = cellsFromWindows([monday(510, 660)]);

    expect([...cells]).toEqual([cellKey("MONDAY", 9), cellKey("MONDAY", 10)]);
  });

  it("round-trips whole-hour windows", () => {
    const windows = [monday(480, 720), { dayOfWeek: "FRIDAY" as const, startMinute: 840, endMinute: 960 }];

    expect(windowsFromCells(cellsFromWindows(windows))).toEqual(windows);
  });
});

describe("timetable grid", () => {
  const lesson = { ...monday(510, 600), id: "a" };

  it("finds the class occupying any part of a cell", () => {
    expect(findInCell([lesson], "MONDAY", 8)).toBe(lesson);
    expect(findInCell([lesson], "MONDAY", 9)).toBe(lesson);
    expect(findInCell([lesson], "MONDAY", 10)).toBeNull();
    expect(findInCell([lesson], "MONDAY", 7)).toBeNull();
    expect(findInCell([lesson], "TUESDAY", 8)).toBeNull();
  });

  it("shows a class label only in the first cell it occupies", () => {
    expect(startsInCell(lesson, 8)).toBe(true);
    expect(startsInCell(lesson, 9)).toBe(false);
    // A class starting before the grid's first row is labelled in that first row
    expect(startsInCell(monday(300, 420), 6)).toBe(true);
  });
});
