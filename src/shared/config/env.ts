export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  // The LiveKit server browsers connect to for audio and video
  livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880",
  // The video-server, which receives the chat messages of a class
  videoServerUrl: process.env.NEXT_PUBLIC_VIDEO_SERVER_URL ?? "http://localhost:8080",
} as const;
