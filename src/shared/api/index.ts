import { env } from "@/shared/config/env";
import { createApiClient } from "./api-client";
import { createRealtime } from "./realtime";

export { ApiError } from "./api-client";
export type { ApiClient, RequestOptions } from "./api-client";
export { readEventStream } from "./event-stream";
export type { Realtime, RealtimeEvent } from "./realtime";

/** The single API client instance for the app. */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  refreshPath: "/auth/refresh",
});

/** The single live connection of the app; `RealtimeConnection` opens it while someone is signed in. */
export const realtime = createRealtime({
  url: `${env.apiUrl}/realtime`,
  getToken: () => apiClient.getAccessToken(),
  refresh: () => apiClient.refresh(),
});

/** Headers naming the institution an admin request acts on; the backend authorizes against it. */
export function forInstitution(institutionId: string): Record<string, string> {
  return { "x-institution-id": institutionId };
}

/** The backend error code of a failed request, or "UNKNOWN" for anything else. */
export function errorCode(error: unknown): string {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : "UNKNOWN";
}
