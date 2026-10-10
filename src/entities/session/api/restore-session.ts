import { apiClient } from "@/shared/api";
import type { AuthResponse } from "../model/types";

/** Trades the httpOnly refresh cookie for a session; resolves to null when there is none. */
export async function restoreSession(): Promise<AuthResponse | null> {
  try {
    return await apiClient.request<AuthResponse>("/auth/refresh", {
      method: "POST",
      skipAuth: true,
    });
  } catch {
    return null;
  }
}
