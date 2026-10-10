"use client";

import { useState } from "react";
import { useActiveInstitution } from "@/entities/institution";
import { useSession } from "@/entities/session";
import { apiClient } from "@/shared/api";
import { useDictionary } from "@/shared/i18n";
import { Button } from "@/shared/ui";

export function LogoutButton() {
  const session = useSession();
  const institution = useActiveInstitution();
  const { auth } = useDictionary();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      await apiClient.request<void>("/auth/logout", { method: "POST", skipAuth: true });
    } finally {
      // Sign out locally even if the request failed, so the user is never stuck signed in
      institution.clear();
      session.clear();
    }
  }

  return (
    <Button variant="secondary" isLoading={isLoading} onClick={handleClick}>
      {auth.logout}
    </Button>
  );
}
