"use client";

import { apiClient } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { useSubmit } from "@/shared/lib/use-submit";
import { Button, ErrorNotice } from "@/shared/ui";

const startGoogleLink = () =>
  apiClient.request<{ url: string }>("/auth/google/link", { method: "POST" });

/**
 * Starts linking Google to the signed-in account. The backend answers with
 * Google's consent URL (and remembers who asked in an httpOnly cookie), then
 * Google sends the browser back to the settings page.
 */
export function LinkGoogleButton() {
  const { settings, errors } = useDictionary();
  const { submit, isSubmitting, error } = useSubmit(startGoogleLink);

  async function handleClick() {
    const started = await submit();
    if (started) {
      window.location.assign(started.url);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorNotice message={errorMessage(errors, error)} />
      <Button variant="secondary" isLoading={isSubmitting} onClick={handleClick}>
        {settings.google.link}
      </Button>
    </div>
  );
}
