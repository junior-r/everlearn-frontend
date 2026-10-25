"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback } from "react";
import { fetchClassTranscript, transcriptText, type ClassTranscript } from "@/entities/class-session";
import { errorMessage, format, useDictionary, useLocale } from "@/shared/i18n";
import { fileName, saveBlob } from "@/shared/lib/download";
import { useResource } from "@/shared/lib/use-resource";
import { Button, ErrorNotice } from "@/shared/ui";

interface TranscriptViewProps {
  institutionId: string;
  sessionId: string;
}

/** What was said in one past class, line by line, and the way to save it as a text file. */
export function TranscriptView({ institutionId, sessionId }: TranscriptViewProps) {
  const { classroom, common, errors } = useDictionary();
  const text = classroom.transcripts;
  const locale = useLocale();
  const load = useCallback(() => fetchClassTranscript(institutionId, sessionId), [institutionId, sessionId]);
  const { data, error } = useResource(load);
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" });
  const clock = new Intl.DateTimeFormat(locale, { timeStyle: "medium" });

  function download(transcript: ClassTranscript) {
    const date = day.format(new Date(transcript.startsAt));
    const content = transcriptText(transcript, date, { unknownSpeaker: text.unknownSpeaker });
    const name = `${text.exportName} ${transcript.subjectName} ${transcript.groupName} ${transcript.startsAt.slice(0, 10)}`;
    saveBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), fileName(name, "txt"));
  }

  if (error) {
    return <ErrorNotice message={errorMessage(errors, error)} />;
  }
  if (!data) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button size="sm" variant="secondary" onClick={() => download(data)}>
          <DownloadSimpleIcon aria-hidden className="size-4" />
          {text.download}
        </Button>
      </div>
      <ol aria-label={text.linesLabel} className="flex flex-col gap-3">
        {data.lines.map((line) => (
          <li key={line.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <time dateTime={line.startedAt} className="shrink-0 font-mono text-xs text-muted sm:w-20 sm:pt-0.5">
              {clock.format(new Date(line.startedAt))}
            </time>
            <p className="min-w-0 text-sm">
              <span className="font-semibold">{line.speakerName || text.unknownSpeaker}</span>
              {format(text.said, { text: line.text })}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
