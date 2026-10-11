import type { Tone } from "@/shared/lib/tone";
import type { Role, UserStatus } from "./types";

/** The colour that stands for each role everywhere it is shown. */
export const roleTone: Record<Role, Tone> = {
  ADMIN: "grape",
  COORDINATOR: "pink",
  TEACHER: "sky",
  STAFF: "sun",
  STUDENT: "mint",
  GUARDIAN: "coral",
};

/** Active reads as "go", anything still pending as "wait", the rest as "stopped". */
export function statusTone(status: UserStatus): Tone {
  if (status === "ACTIVE") {
    return "mint";
  }
  return status === "PENDING_ONBOARDING" ? "sun" : "coral";
}
