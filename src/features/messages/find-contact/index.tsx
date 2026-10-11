"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useId, useState } from "react";
import { MIN_SEARCH_LENGTH, searchContacts, type Contact } from "@/entities/message";
import { roleTone } from "@/entities/session";
import { errorCode } from "@/shared/api";
import { errorMessage, useDictionary } from "@/shared/i18n";
import { Avatar, Badge, ErrorNotice } from "@/shared/ui";

const SEARCH_DELAY_MS = 300;

interface FindContactProps {
  institutionId: string;
  onPick(contact: Contact): void;
}

type Search = { query: string; contacts: Contact[]; error: string | null };

/** Looks members of the institution up by name, to start a conversation with one of them. */
export function FindContact({ institutionId, onPick }: FindContactProps) {
  const { messages: text, roles, errors } = useDictionary();
  const [query, setQuery] = useState("");
  // What the last search found, and for which words, so stale results are never shown for new ones
  const [found, setFound] = useState<Search | null>(null);
  const inputId = useId();
  const wanted = query.trim();
  const isSearchable = wanted.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!isSearchable) {
      return;
    }
    const controller = new AbortController();
    // Wait for a pause in the typing instead of asking on every key
    const timer = setTimeout(() => {
      searchContacts(institutionId, wanted, controller.signal)
        .then((contacts) => setFound({ query: wanted, contacts, error: null }))
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setFound({ query: wanted, contacts: [], error: errorCode(error) });
          }
        });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [institutionId, wanted, isSearchable]);

  const results = isSearchable && found?.query === wanted ? found : null;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {text.search.label}
      </label>
      <div className="relative">
        <MagnifyingGlassIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          placeholder={text.search.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm transition-colors hover:border-brand/50 placeholder:text-muted focus-visible:border-brand focus-visible:outline-4 focus-visible:outline-brand/25"
        />
      </div>
      <ErrorNotice message={errorMessage(errors, results?.error)} />
      {results && !results.error && (
        <ul aria-label={text.search.results} className="flex flex-col gap-1">
          {results.contacts.length === 0 && <li className="px-1 py-2 text-sm text-muted">{text.search.empty}</li>}
          {results.contacts.map((contact) => {
            const name = `${contact.firstName} ${contact.lastName}`;
            return (
              <li key={contact.userId}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    onPick(contact);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <Avatar name={name} />
                  <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                  <span className="flex shrink-0 gap-1">
                    {contact.roles.map((role) => (
                      <Badge key={role} tone={roleTone[role]}>
                        {roles[role]}
                      </Badge>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
