import {
  AudioPresets,
  ScreenSharePresets,
  VideoPresets,
  type RoomOptions,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
} from "livekit-client";
import type { ClassroomRole } from "@/entities/class-session";

/**
 * How a class sends and receives video. Each viewer is sent the layer that
 * fits the size a tile has on their screen, so the tile on the stage is sharp
 * and the small ones cost little; layers nobody watches are not encoded.
 */
export function roomOptions(role: ClassroomRole): RoomOptions {
  // The Teacher is the one on the stage; a Student is mostly a small tile, sent from a home connection
  const camera = role === "TEACHER" ? VideoPresets.h720 : VideoPresets.h360;
  return {
    // Sized for the screen's real pixels: on a dense display a tile needs more than its CSS size
    adaptiveStream: { pixelDensity: "screen" },
    dynacast: true,
    videoCaptureDefaults: { resolution: camera.resolution },
    publishDefaults: {
      videoEncoding: camera.encoding,
      videoSimulcastLayers: role === "TEACHER" ? [VideoPresets.h180, VideoPresets.h360] : [VideoPresets.h180],
      // A screen is read, not watched: more bitrate than a camera, and a 720p layer for slow connections
      screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
      screenShareSimulcastLayers: [ScreenSharePresets.h720fps15],
    },
  };
}

/**
 * A shared screen is captured at full size and encoded to keep text sharp rather than motion smooth.
 * Its sound comes too (a tab anywhere, a whole screen on Windows), untouched by voice processing.
 */
export const SCREEN_CAPTURE: ScreenShareCaptureOptions = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  systemAudio: "include",
  resolution: ScreenSharePresets.h1080fps30.resolution,
  contentHint: "detail",
};

/**
 * VP9 keeps text and diagrams sharper than VP8 at the same bitrate. A browser
 * that cannot decode it gets a VP8 copy, and a slow link drops frames, not sharpness.
 */
export const SCREEN_PUBLISH: TrackPublishOptions = {
  videoCodec: "vp9",
  backupCodec: { codec: "vp8" },
  degradationPreference: "maintain-resolution",
  // A video's soundtrack is music, not speech: a music bitrate, and no pausing on quiet passages
  audioPreset: AudioPresets.musicHighQuality,
  dtx: false,
};
