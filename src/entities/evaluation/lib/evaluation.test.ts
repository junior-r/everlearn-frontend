import { describe, expect, it } from "vitest";
import { dayKey, groupByDay, monthGrid, monthRange, shiftMonth } from "./calendar";
import { formatNumber, fromDateTimeLocal, parseScore, toDateTimeLocal } from "./scores";

describe("parseScore", () => {
  it("reads whole numbers and decimals written with a point or a comma", () => {
    expect(parseScore("15", 20)).toEqual({ kind: "valid", value: 15 });
    expect(parseScore(" 15.5 ", 20)).toEqual({ kind: "valid", value: 15.5 });
    expect(parseScore("15,25", 20)).toEqual({ kind: "valid", value: 15.25 });
    expect(parseScore("0", 20)).toEqual({ kind: "valid", value: 0 });
    expect(parseScore("20", 20)).toEqual({ kind: "valid", value: 20 });
  });

  it("treats an empty field as no score", () => {
    expect(parseScore("", 20)).toEqual({ kind: "empty" });
    expect(parseScore("   ", 20)).toEqual({ kind: "empty" });
  });

  it.each(["20.01", "-1", "abc", "1.234", "1e1", "1,2,3", "."])("refuses %s", (text) => {
    expect(parseScore(text, 20)).toEqual({ kind: "invalid" });
  });
});

describe("formatNumber", () => {
  it("writes at most two decimals, the way the locale writes them", () => {
    expect(formatNumber(81.25, "es")).toBe("81,25");
    expect(formatNumber(81.25, "en")).toBe("81.25");
    expect(formatNumber(60, "es")).toBe("60");
  });

  it("writes large scores so that they can be read back", () => {
    expect(formatNumber(1250.5, "es")).toBe("1250,5");
    expect(parseScore(formatNumber(1250.5, "es"), 2000)).toEqual({ kind: "valid", value: 1250.5 });
  });
});

describe("datetime-local values", () => {
  it("round-trip through an ISO date-time", () => {
    const iso = new Date(2026, 10, 10, 14, 30).toISOString();

    expect(toDateTimeLocal(iso)).toBe("2026-11-10T14:30");
    expect(fromDateTimeLocal(toDateTimeLocal(iso))).toBe(iso);
  });

  it("map an empty field and a missing date to each other", () => {
    expect(toDateTimeLocal(null)).toBe("");
    expect(fromDateTimeLocal("")).toBeNull();
    expect(fromDateTimeLocal("not a date")).toBeNull();
  });
});

describe("monthGrid", () => {
  it("shows whole weeks starting on Monday", () => {
    // November 2026 starts on a Sunday and ends on a Monday
    const weeks = monthGrid({ year: 2026, month: 10 });

    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7 && week[0].getDay() === 1)).toBe(true);
    expect(dayKey(weeks[0][0])).toBe("2026-10-26");
    expect(dayKey(weeks[0][6])).toBe("2026-11-01");
    expect(dayKey(weeks[5][0])).toBe("2026-11-30");
    expect(dayKey(weeks[5][6])).toBe("2026-12-06");
  });

  it("needs no days of other months when the month fits its weeks exactly", () => {
    // February 2027 starts on a Monday and has 28 days
    const weeks = monthGrid({ year: 2027, month: 1 });

    expect(weeks).toHaveLength(4);
    expect(dayKey(weeks[0][0])).toBe("2027-02-01");
    expect(dayKey(weeks[3][6])).toBe("2027-02-28");
  });
});

describe("moving between months", () => {
  it("rolls over the year in both directions", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("spans a month from its first instant to the first of the next", () => {
    const { from, to } = monthRange({ year: 2026, month: 11 });

    expect(dayKey(from)).toBe("2026-12-01");
    expect(dayKey(to)).toBe("2027-01-01");
  });
});

describe("groupByDay", () => {
  it("groups by local day and keeps the order within a day", () => {
    const at = (day: number, hour: number) => ({ id: `${day}-${hour}`, date: new Date(2026, 10, day, hour) });
    const items = [at(10, 8), at(10, 23), at(11, 0)];

    const days = groupByDay(items, (item) => item.date);

    expect([...days.keys()]).toEqual(["2026-11-10", "2026-11-11"]);
    expect(days.get("2026-11-10")?.map((item) => item.id)).toEqual(["10-8", "10-23"]);
  });
});
