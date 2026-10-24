import { describe, expect, it } from "vitest";
import type { ClassTranscript } from "../model/types";
import { transcriptText } from "./transcript-text";

const transcript: ClassTranscript = {
  sessionId: "s-1",
  subjectName: "Matemática",
  groupName: "1ro A",
  startsAt: "2026-10-12T08:00:00.000Z",
  lines: [
    {
      id: "l-1",
      speakerName: "Alan Turing",
      text: "Buenos días",
      startedAt: "2026-10-12T08:00:04.000Z",
      endedAt: "2026-10-12T08:00:06.000Z",
    },
    {
      id: "l-2",
      speakerName: null,
      text: "¿Se oye?",
      startedAt: "2026-10-12T09:12:30.900Z",
      endedAt: "2026-10-12T09:12:33.000Z",
    },
  ],
};

describe("transcriptText", () => {
  it("writes a heading, then each line with how far into the class it was said", () => {
    expect(transcriptText(transcript, "12 de octubre de 2026", { unknownSpeaker: "Sin identificar" })).toBe(
      [
        "Matemática · 1ro A",
        "12 de octubre de 2026",
        "",
        "[00:00:04] Alan Turing: Buenos días",
        "[01:12:30] Sin identificar: ¿Se oye?",
        "",
      ].join("\n"),
    );
  });

  it("counts a line said before the class started as said at its start", () => {
    const early = { ...transcript, lines: [{ ...transcript.lines[0], startedAt: "2026-10-12T07:59:00.000Z" }] };

    expect(transcriptText(early, "", { unknownSpeaker: "?" })).toContain("[00:00:00] Alan Turing");
  });
});
