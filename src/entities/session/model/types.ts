export type Role = "ADMIN" | "COORDINATOR" | "TEACHER" | "STUDENT" | "GUARDIAN";

export type UserStatus = "PENDING_ONBOARDING" | "ACTIVE" | "SUSPENDED";

export interface Membership {
  id: string;
  institutionId: string;
  role: Role;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: UserStatus;
  isPlatformAdmin: boolean;
  /** True while the account still has the temporary password an admin issued. */
  mustChangePassword: boolean;
  googleLinked: boolean;
  memberships: Membership[];
}

/** Body returned by every endpoint that opens or renews a session. */
export interface AuthResponse {
  accessToken: string;
  user: SessionUser;
}
