import type { AuthResponse } from "@/entities/session";
import { apiClient } from "@/shared/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export function login(credentials: LoginCredentials, headers?: Record<string, string>): Promise<AuthResponse> {
  return apiClient.request<AuthResponse>("/auth/login", {
    method: "POST",
    body: credentials,
    headers,
    skipAuth: true,
  });
}
