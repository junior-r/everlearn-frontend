"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import { fetchRecordingLink } from "@/entities/class-session";
import { errorCode } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useResource } from "@/shared/lib/use-resource";
import { Button, ErrorNotice } from "@/shared/ui";

interface RecordingPlayerProps {
  institutionId: string;
  recordingId: string;
  /** What the player is called for assistive technology: the class it shows. */
  label: string;
}

/**
 * Plays one recorded class from a short-lived link the backend hands out, and
 * downloads it through another. The file never passes through the frontend.
 */
export function RecordingPlayer({ institutionId, recordingId, label }: RecordingPlayerProps) {
  const { classroom, common, errors } = useDictionary();
  const text = classroom.recordings;
  const load = useCallback(() => fetchRecordingLink(institutionId, recordingId, false), [institutionId, recordingId]);
  const { data, error } = useResource(load);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const link = await fetchRecordingLink(institutionId, recordingId, true);
      // The link answers as an attachment, so the browser saves it and this page stays
      window.location.assign(link.url);
    } catch (caught) {
      setDownloadError(errorCode(caught));
    } finally {
      setIsDownloading(false);
    }
  }

  if (error) {
    return <ErrorNotice message={errorMessage(errors, error)} />;
  }
  if (!data) {
    return <p className="text-sm text-muted">{common.loading}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <video
        controls
        preload="metadata"
        src={data.url}
        aria-label={label}
        className="aspect-video w-full rounded-2xl bg-ink"
      />
      <div>
        <Button size="sm" variant="secondary" isLoading={isDownloading} onClick={() => void download()}>
          <DownloadSimpleIcon aria-hidden className="size-4" />
          {text.download}
        </Button>
      </div>
      <ErrorNotice message={errorMessage(errors, downloadError)} />
    </div>
  );
}
