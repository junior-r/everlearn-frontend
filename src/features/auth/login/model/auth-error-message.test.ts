import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-error-message";

describe("authErrorMessage", () => {
  it("returns nothing when there is no error", () => {
    expect(authErrorMessage(null)).toBeNull();
    expect(authErrorMessage(undefined)).toBeNull();
    expect(authErrorMessage("")).toBeNull();
  });

  it("maps known backend codes to specific text", () => {
    expect(authErrorMessage("INVALID_CREDENTIALS")).toBe("The email or password is incorrect.");
    expect(authErrorMessage("ACCOUNT_SUSPENDED")).toContain("suspended");
  });

  it("never echoes an unknown code back to the page", () => {
    const message = authErrorMessage("<script>alert(1)</script>");

    expect(message).toBe("Something went wrong. Please try again.");
  });
});
