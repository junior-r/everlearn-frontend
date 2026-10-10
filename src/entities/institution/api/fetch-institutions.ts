import { apiClient } from "@/shared/api";
import type { Institution } from "../model/types";

/** Every institution for a Platform Admin; otherwise the ones the signed-in user belongs to. */
export function fetchInstitutions(): Promise<Institution[]> {
  return apiClient.request<Institution[]>("/institutions");
}
