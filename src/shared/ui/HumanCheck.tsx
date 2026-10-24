"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { HUMAN_CHECK_HEADER } from "@/shared/api";
import { env } from "@/shared/config/env";
import { useDictionary, useLocale } from "@/shared/i18n";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  language: string;
  theme: "auto";
  size: "flexible";
  callback(token: string): void;
  "expired-callback"(): void;
  "error-callback"(): void;
}

interface Turnstile {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | null = null;

/** Loads Cloudflare's script once per page; a failed load may be retried by the next widget. */
function loadTurnstile(): Promise<Turnstile> {
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Turnstile could not load"));
    };
    document.head.append(script);
  });
  return loading;
}

interface WidgetProps {
  action: string;
  onToken(token: string | null): void;
  onError(): void;
}

function TurnstileWidget({ action, onToken, onError }: WidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  useEffect(() => {
    let widgetId: string | null = null;
    let isCancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (isCancelled || !container.current) {
          return;
        }
        widgetId = turnstile.render(container.current, {
          sitekey: env.turnstileSiteKey,
          action,
          language: locale,
          theme: "auto",
          size: "flexible",
          callback: onToken,
          "expired-callback": () => onToken(null),
          "error-callback": onError,
        });
      })
      .catch(onError);
    return () => {
      isCancelled = true;
      if (widgetId) {
        window.turnstile?.remove(widgetId);
      }
    };
  }, [action, locale, onToken, onError]);

  // Reserves the widget's height so the form does not jump when it appears
  return <div ref={container} className="min-h-[65px]" />;
}

export interface HumanCheck {
  /** The challenge, to place above the submit button; null when the check is off. */
  widget: ReactNode;
  /** False until the challenge is solved; the form should not submit before. */
  isReady: boolean;
  /** Headers that carry the solved challenge to the API. */
  headers: Record<string, string> | undefined;
  /** Starts a fresh challenge. Call after every failed submit: a token works once. */
  reset(): void;
}

/**
 * The bot check of a public form (Cloudflare Turnstile), for the backend route
 * guarded with the same `action`. Off when no site key was built in.
 */
export function useHumanCheck(action: string): HumanCheck {
  const { common } = useDictionary();
  const [token, setToken] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [round, setRound] = useState(0);

  const handleToken = useCallback((value: string | null) => {
    setToken(value);
    if (value) {
      setHasFailed(false);
    }
  }, []);
  const handleError = useCallback(() => {
    setToken(null);
    setHasFailed(true);
  }, []);
  const reset = useCallback(() => {
    setToken(null);
    setRound((current) => current + 1);
  }, []);

  if (!env.turnstileSiteKey) {
    return { widget: null, isReady: true, headers: undefined, reset: () => undefined };
  }
  return {
    widget: (
      <div className="flex flex-col gap-1.5">
        <TurnstileWidget key={round} action={action} onToken={handleToken} onError={handleError} />
        {hasFailed && (
          <p role="alert" className="text-xs text-danger">
            {common.humanCheckUnavailable}
          </p>
        )}
      </div>
    ),
    isReady: token !== null,
    headers: token ? { [HUMAN_CHECK_HEADER]: token } : undefined,
    reset,
  };
}
