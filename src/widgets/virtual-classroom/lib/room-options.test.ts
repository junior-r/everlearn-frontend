import { AudioPresets, VideoPresets } from "livekit-client";
import { describe, expect, it } from "vitest";
import { roomOptions, SCREEN_CAPTURE, SCREEN_PUBLISH } from "./room-options";

describe("roomOptions", () => {
  it("sends the Teacher's camera at 720p with two lighter layers", () => {
    const options = roomOptions("TEACHER");

    expect(options.videoCaptureDefaults?.resolution).toEqual(VideoPresets.h720.resolution);
    expect(options.publishDefaults?.videoEncoding).toEqual(VideoPresets.h720.encoding);
    expect(options.publishDefaults?.videoSimulcastLayers).toEqual([VideoPresets.h180, VideoPresets.h360]);
  });

  it("sends a Student's camera at 360p, which their tile needs and a home upload can carry", () => {
    const options = roomOptions("STUDENT");

    expect(options.videoCaptureDefaults?.resolution).toEqual(VideoPresets.h360.resolution);
    expect(options.publishDefaults?.videoEncoding).toEqual(VideoPresets.h360.encoding);
    expect(options.publishDefaults?.videoSimulcastLayers).toEqual([VideoPresets.h180]);
  });

  it("only encodes what someone watches, sized for each viewer", () => {
    for (const role of ["TEACHER", "STUDENT"] as const) {
      expect(roomOptions(role)).toMatchObject({ dynacast: true, adaptiveStream: { pixelDensity: "screen" } });
    }
  });
});

describe("SCREEN_CAPTURE", () => {
  it("captures the screen's sound as it is, with no voice processing", () => {
    expect(SCREEN_CAPTURE).toMatchObject({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      systemAudio: "include",
    });
  });
});

describe("SCREEN_PUBLISH", () => {
  it("shares screens in VP9 with a VP8 copy for browsers without it, keeping resolution", () => {
    expect(SCREEN_PUBLISH).toMatchObject({
      videoCodec: "vp9",
      backupCodec: { codec: "vp8" },
      degradationPreference: "maintain-resolution",
    });
  });

  it("sends the screen's sound at a music bitrate, without pausing on quiet passages", () => {
    expect(SCREEN_PUBLISH).toMatchObject({ audioPreset: AudioPresets.musicHighQuality, dtx: false });
  });
});
