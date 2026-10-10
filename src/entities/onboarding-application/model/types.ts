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

export interface OnboardingApplication {
  id: string;
  status: OnboardingStatus;
  documentType: DocumentType | null;
  extracted: ExtractedIdentity | null;
}

export interface ApplicationResponse {
  application: OnboardingApplication | null;
}
