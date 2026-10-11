import { describe, expect, it } from "vitest";
import { timeAgo } from "./time-ago";

const NOW = new Date("2026-10-11T12:00:00Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();

describe("timeAgo", () => {
  it("counts minutes, hours and days in the reader's language", () => {
    expect(timeAgo(ago(5 * 60), "es", NOW)).toBe("hace 5 minutos");
    expect(timeAgo(ago(3 * 3600 + 20), "es", NOW)).toBe("hace 3 horas");
    expect(timeAgo(ago(2 * 86_400), "es", NOW)).toBe("anteayer");
    expect(timeAgo(ago(5 * 60), "en", NOW)).toBe("5 minutes ago");
  });

  it("says so when it has only just happened, even if the clocks disagree slightly", () => {
    expect(timeAgo(ago(20), "es", NOW)).toBe("este minuto");
    expect(timeAgo(ago(-30), "es", NOW)).toBe("este minuto");
  });

  it("gives the date once a week has passed", () => {
    expect(timeAgo("2026-09-20T09:00:00Z", "en", NOW)).toBe("Sep 20, 2026");
  });
});
