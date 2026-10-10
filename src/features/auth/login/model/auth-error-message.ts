const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "The email or password is incorrect.",
  ACCOUNT_SUSPENDED: "This account has been suspended. Contact your institution.",
  NETWORK_ERROR: "We could not reach the server. Check your connection and try again.",
  GOOGLE_OAUTH_UNAVAILABLE: "Google sign-in is not available right now.",
  GOOGLE_EMAIL_NOT_VERIFIED: "Your Google account email is not verified.",
  GOOGLE_AUTHENTICATION_FAILED: "Google sign-in did not complete. Please try again.",
  INVALID_OAUTH_STATE: "Google sign-in did not complete. Please try again.",
};

const FALLBACK = "Something went wrong. Please try again.";

/** Turns a backend error code into text for the user; unknown codes get a generic message. */
export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return MESSAGES[code] ?? FALLBACK;
}
