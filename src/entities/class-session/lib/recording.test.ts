import { describe, expect, it } from "vitest";
import { recordingSize } from "./recording";

describe("recordingSize", () => {
  it("says megabytes below a gigabyte and gigabytes from there, in the reader's locale", () => {
    expect(recordingSize(250_400_000, "en")).toBe("250.4 MB");
    expect(recordingSize(1_450_000_000, "en")).toBe("1.5 GB");
    expect(recordingSize(1_450_000_000, "es")).toBe("1,5 GB");
  });
});
