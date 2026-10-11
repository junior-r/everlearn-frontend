"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button, buttonBase, buttonStyles, ErrorNotice } from "@/shared/ui";
import { fitWidth, frameToSourceRect, ID_CARD_ASPECT_RATIO } from "../lib/crop";

type CameraState = "idle" | "starting" | "live" | "preview";
type CameraError = "denied" | "unavailable";

const MAX_OUTPUT_WIDTH = 1600;
const JPEG_QUALITY = 0.9;

interface DocumentCameraProps {
  disabled?: boolean;
  onConfirm(photo: Blob): void;
}

function toCameraError(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : "";
  return name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable";
}

/**
 * Webcam capture with an ID-card-shaped alignment frame. The saved photo is
 * cropped to that frame. Falls back to a file picker when no camera can be used.
 */
export function DocumentCamera({ disabled = false, onConfirm }: DocumentCameraProps) {
  const { onboarding } = useDictionary();
  const text = onboarding.camera;
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<CameraError | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Release the camera when the component goes away, so its indicator light turns off
  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    const url = photo?.url;
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photo]);

  // The <video> only exists once the state is "live", so the stream is attached here rather than in startCamera
  useEffect(() => {
    if (state === "live" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  async function startCamera() {
    setError(null);
    setPhoto(null);
    setState("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Camera API missing", "NotFoundError");
      }
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // Prefer the rear camera on phones; desktops ignore this and use the webcam
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
      });
      setState("live");
    } catch (caught) {
      setError(toCameraError(caught));
      setState("idle");
    }
  }

  function showPreview(blob: Blob) {
    stopCamera();
    setPhoto({ blob, url: URL.createObjectURL(blob) });
    setState("preview");
  }

  function capture() {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || video.videoWidth === 0) {
      return;
    }
    const videoBox = video.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const source = frameToSourceRect(
      { width: video.videoWidth, height: video.videoHeight },
      { width: videoBox.width, height: videoBox.height },
      {
        x: frameBox.left - videoBox.left,
        y: frameBox.top - videoBox.top,
        width: frameBox.width,
        height: frameBox.height,
      },
    );
    const output = fitWidth(source, MAX_OUTPUT_WIDTH);
    const canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    canvas
      .getContext("2d")
      ?.drawImage(
        video,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        output.width,
        output.height,
      );
    canvas.toBlob((blob) => blob && showPreview(blob), "image/jpeg", JPEG_QUALITY);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change event
    event.target.value = "";
    if (file) {
      setError(null);
      showPreview(file);
    }
  }

  const uploadFallback = (
    <label className={cn(buttonBase, buttonStyles.secondary, "cursor-pointer")}>
      {text.upload}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={handleFile}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <ErrorNotice message={error ? text[error] : null} />

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
        {state === "live" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
              data-testid="camera-video"
            />
            <div
              ref={frameRef}
              aria-hidden
              // The huge shadow dims everything outside the frame without extra elements
              className="absolute left-1/2 top-1/2 w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{ aspectRatio: ID_CARD_ASPECT_RATIO }}
            />
          </>
        )}
        {state === "preview" && photo && (
          // A blob URL of the user's own capture; next/image cannot optimise it
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={text.previewAlt} className="size-full object-contain" />
        )}
        {(state === "idle" || state === "starting") && (
          <div className="pattern-fine-dots flex size-full items-center justify-center p-6 text-on-ink">
            {/* A stand-in ID card, so the frame shows what to place in it */}
            <div
              aria-hidden
              className="flex w-[70%] items-center gap-[6%] rounded-xl border-2 border-dashed border-sun/80 bg-ink-raised/80 p-[6%]"
              style={{ aspectRatio: ID_CARD_ASPECT_RATIO }}
            >
              <span className="aspect-[3/4] h-full rounded-lg bg-grape/70" />
              <span className="flex flex-1 flex-col gap-[10%]">
                <span className="h-2 w-4/5 rounded-full bg-on-ink/40" />
                <span className="h-2 w-3/5 rounded-full bg-on-ink/25" />
                <span className="h-2 w-2/5 rounded-full bg-sun/70" />
              </span>
            </div>
          </div>
        )}
      </div>

      {state === "live" && <p className="text-sm text-muted">{text.instructions}</p>}

      {(state === "idle" || state === "starting") && (
        <div className="flex flex-col gap-3">
          <Button onClick={startCamera} isLoading={state === "starting"} disabled={disabled}>
            {state === "starting" ? text.starting : text.start}
          </Button>
          {uploadFallback}
        </div>
      )}
      {state === "live" && <Button onClick={capture}>{text.capture}</Button>}
      {state === "preview" && photo && (
        <div className="flex flex-col gap-3">
          <Button onClick={() => onConfirm(photo.blob)} disabled={disabled}>
            {text.use}
          </Button>
          <Button variant="secondary" onClick={startCamera} disabled={disabled}>
            {text.retake}
          </Button>
        </div>
      )}
    </div>
  );
}
