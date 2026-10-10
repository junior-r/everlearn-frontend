import type { AuthResponse } from "@/entities/session";
import { apiClient } from "@/shared/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiClient.request<AuthResponse>("/auth/login", {
    method: "POST",
    body: credentials,
    skipAuth: true,
  });
}
