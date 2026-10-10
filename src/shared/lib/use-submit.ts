"use client";

import { useCallback, useState } from "react";
import { errorCode } from "@/shared/api";

/**
 * Tracks one async action (a form submit or a button click): whether it is
 * running and the backend error code if it failed. Resolves to the action's
 * result, or null when it failed.
 */
export function useSubmit<Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (...args: Args): Promise<Result | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await action(...args);
      } catch (caught) {
        setError(errorCode(caught));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [action],
  );

  return { submit, isSubmitting, error };
}
