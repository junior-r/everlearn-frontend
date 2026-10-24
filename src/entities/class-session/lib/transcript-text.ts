import type { ClassTranscript } from "../model/types";

/** The words a transcript file needs, from the reader's dictionary. */
export interface TranscriptTextLabels {
  /** Names a line whose speaker is unknown. */
  unknownSpeaker: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** How far into the class a moment is, as hh:mm:ss; a moment before the start counts as the start. */
function offset(from: string, at: string): string {
  const seconds = Math.max(0, Math.floor((Date.parse(at) - Date.parse(from)) / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}

/**
 * A transcript as plain text: a heading with the course and the date the
 * caller formatted, then one `[hh:mm:ss] Name: text` line per stretch said.
 */
export function transcriptText(transcript: ClassTranscript, date: string, labels: TranscriptTextLabels): string {
  const heading = `${transcript.subjectName} · ${transcript.groupName}\n${date}`;
  const lines = transcript.lines.map(
    (line) =>
      `[${offset(transcript.startsAt, line.startedAt)}] ${line.speakerName || labels.unknownSpeaker}: ${line.text}`,
  );
  return [heading, "", ...lines].join("\n") + "\n";
}
