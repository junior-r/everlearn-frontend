import type { Role } from "@/entities/session/@x/onboarding-application";

export type OnboardingStatus =
  | "PENDING_UPLOAD"
  | "PROCESSING"
  | "PENDING_CONFIRMATION"
  | "NEEDS_REVIEW"
  | "APPROVED"
  | "REJECTED";

export const DOCUMENT_TYPES = ["NATIONAL_ID", "PASSPORT", "OTHER"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** What the OCR read from the ID. `birthDate` is YYYY-MM-DD. */
export interface ExtractedIdentity {
  firstName: string;
  lastName: string;
  documentNumber: string;
  birthDate: string | null;
  confidence: number;
}

/** What the applicant confirmed after checking the OCR reading. */
export interface ConfirmedIdentity {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
}

export interface OnboardingApplication {
  id: string;
  status: OnboardingStatus;
  documentType: DocumentType | null;
  extracted: ExtractedIdentity | null;
  rejectionReason: string | null;
}

/** An application as an Institution Admin reviews it. */
export interface ApplicationReview extends OnboardingApplication {
  requestedRole: Role | null;
  /** The account as the institution registered it. */
  applicant: { userId: string; email: string; firstName: string; lastName: string };
  confirmed: ConfirmedIdentity | null;
}

export interface ApplicationResponse {
  application: OnboardingApplication | null;
}
