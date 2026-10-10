import { apiClient, forInstitution } from "@/shared/api";

export interface Subject {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  description: string | null;
}

export function fetchSubjects(institutionId: string): Promise<Subject[]> {
  return apiClient.request<Subject[]>("/subjects", { headers: forInstitution(institutionId) });
}
