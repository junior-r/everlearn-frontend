import { ScreenSharePresets, VideoPresets, type RoomOptions, type ScreenShareCaptureOptions } from "livekit-client";

/**
 * How a class sends and receives video. Each viewer is sent the layer that
 * fits the size a tile has on their screen, so the tile on the stage is sharp
 * and the small ones cost little; layers nobody watches are not encoded.
 */
export const ROOM_OPTIONS: RoomOptions = {
  // Sized for the screen's real pixels: on a dense display a tile needs more than its CSS size
  adaptiveStream: { pixelDensity: "screen" },
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  publishDefaults: {
    videoEncoding: VideoPresets.h720.encoding,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    // A screen is read, not watched: more bitrate than a camera, and a 720p layer for slow connections
    screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
    screenShareSimulcastLayers: [ScreenSharePresets.h720fps15],
  },
};

/** A shared screen is captured at full size and encoded to keep text sharp rather than motion smooth. */
export const SCREEN_CAPTURE: ScreenShareCaptureOptions = {
  audio: false,
  resolution: ScreenSharePresets.h1080fps30.resolution,
  contentHint: "detail",
};
