import { env } from "@/shared/config/env";
import { createApiClient } from "./api-client";

export { ApiError } from "./api-client";
export type { ApiClient, RequestOptions } from "./api-client";
export { readEventStream } from "./event-stream";

/** The single API client instance for the app. */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  refreshPath: "/auth/refresh",
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
