import { apiClient, forInstitution } from "@/shared/api";

/** A subject's place in a pensum: which level it is taught in and its workload. */
export interface PensumSubject {
  subjectId: string;
  code: string;
  name: string;
  level: number;
  weeklyHours: number;
  credits: number | null;
}

/** A curriculum: the versioned list of subjects a group follows. */
export interface Pensum {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  version: number;
  isActive: boolean;
  subjects: PensumSubject[];
}

export function fetchPensums(institutionId: string): Promise<Pensum[]> {
  return apiClient.request<Pensum[]>("/pensums", { headers: forInstitution(institutionId) });
}
