export type OnboardingStatus = "PENDING_UPLOAD" | "PROCESSING" | "PENDING_CONFIRMATION" | "APPROVED";

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

/** The data confirmed at the desk against the original document. */
export interface ConfirmedIdentity {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
}

/** One member's identity check, done in person by whoever registers them. */
export interface OnboardingApplication {
  id: string;
  status: OnboardingStatus;
  documentType: DocumentType | null;
  extracted: ExtractedIdentity | null;
}

export interface ApplicationResponse {
  application: OnboardingApplication;
}
