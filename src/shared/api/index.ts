import { env } from "@/shared/config/env";
import { createApiClient } from "./api-client";

export { ApiError } from "./api-client";
export type { ApiClient, RequestOptions } from "./api-client";

/** The single API client instance for the app. */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  refreshPath: "/auth/refresh",
});
