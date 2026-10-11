/** What a Platform Admin sees of the whole platform. */
export interface PlatformDashboard {
  activeInstitutions: number;
  inactiveInstitutions: number;
  totalUsers: number;
  /** ID documents waiting for a decision, in every institution. */
  pendingReviews: number;
  usersByStatus: { active: number; pendingOnboarding: number; suspended: number };
  /** The active institutions with most active members, largest first. */
  largestInstitutions: Array<{ id: string; name: string; members: number }>;
}

/** How often attendance was marked each way. */
export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export interface InstitutionDashboard {
  activeStudents: number;
  teachers: number;
  /** Groups of an academic period that is running today. */
  activeGroups: number;
  pendingReviews: number;
  attendance: AttendanceCounts;
  /** Percent of the counted classes that were attended, computed by the backend; null without records. */
  attendanceRate: number | null;
}

/** How many averages fall in a band of the 0 to 100 scale; `to` is inclusive. */
export interface GradeBand {
  from: number;
  to: number;
  students: number;
}

export interface StudentAtRisk {
  name: string;
  group: string;
  attendedClasses: number;
  countedClasses: number;
  attendancePercent: number;
}

export interface TeacherDashboard {
  activeCourses: number;
  /** Evaluations still to be published. */
  draftEvaluations: number;
  /** Students below 70% attendance in the Teacher's own classes, lowest first. */
  studentsAtRisk: StudentAtRisk[];
  gradeDistribution: GradeBand[];
  /** How many averages the distribution counts. */
  gradedAverages: number;
}
