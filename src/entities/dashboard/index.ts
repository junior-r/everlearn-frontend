import { apiClient, forInstitution } from "@/shared/api";
import type { InstitutionDashboard, PlatformDashboard, TeacherDashboard } from "./model/types";

export type {
  AttendanceCounts,
  GradeBand,
  InstitutionDashboard,
  PlatformDashboard,
  StudentAtRisk,
  TeacherDashboard,
} from "./model/types";

/** The whole platform in figures. Platform Admins only. */
export function fetchPlatformDashboard(): Promise<PlatformDashboard> {
  return apiClient.request<PlatformDashboard>("/analytics/platform");
}

/** One institution in figures, for its Institution Admin. */
export function fetchInstitutionDashboard(institutionId: string): Promise<InstitutionDashboard> {
  return apiClient.request<InstitutionDashboard>("/analytics/institution", {
    headers: forInstitution(institutionId),
  });
}

/** The signed-in Teacher's own courses in figures. */
export function fetchTeacherDashboard(institutionId: string): Promise<TeacherDashboard> {
  return apiClient.request<TeacherDashboard>("/analytics/teacher", {
    headers: forInstitution(institutionId),
  });
}
