"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";

/** How long typing must pause before the server is asked. */
const SEARCH_DELAY_MS = 250;

interface AutocompleteProps<Option> {
  label: string;
  placeholder?: string;
  value: Option | null;
  onChange(option: Option | null): void;
  /** Asks the server for the options matching what was typed; it must give up when `signal` aborts. */
  search(query: string, signal: AbortSignal): Promise<Option[]>;
  getKey(option: Option): string;
  getLabel(option: Option): string;
  /** A second line that tells apart two options with the same label. */
  getDetail?(option: Option): string;
  /** What the list says while it has no options to show. */
  messages: { hint: string; searching: string; empty: string; failed: string };
  /** Fewer characters than this are not searched. */
  minLength?: number;
}

/**
 * A text field that finds one option on the server as the user types, for
 * lists too long to load whole. Arrow keys move through the matches, Enter
 * picks one, and typing again lets go of the one picked.
 */
export function Autocomplete<Option>({
  label,
  placeholder,
  value,
  onChange,
  search,
  getKey,
  getLabel,
  getDetail,
  messages,
  minLength = 2,
}: AutocompleteProps<Option>) {
  const inputId = useId();
  const listId = useId();
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // The answer to one query; `options` is null when the search failed
  const [result, setResult] = useState<{ query: string; options: Option[] | null } | null>(null);
  const query = text.trim();
  const canSearch = value === null && query.length >= minLength;

  useEffect(() => {
    if (!canSearch) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      search(query, controller.signal)
        .then((options) => setResult({ query, options }))
        .catch(() => !controller.signal.aborted && setResult({ query, options: null }));
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, query, search]);

  // Only the answer to what is typed now counts; an older one is still on its way out
  const answer = canSearch && result?.query === query ? result : null;
  const options = answer?.options ?? [];
  const isListOpen = isOpen && value === null && query.length > 0;
  const activeOption = options[Math.min(activeIndex, options.length - 1)];
  const optionId = (option: Option) => `${listId}-${getKey(option)}`;
  let status: string | null = null;
  if (!canSearch) {
    status = messages.hint;
  } else if (!answer) {
    status = messages.searching;
  } else if (answer.options === null) {
    status = messages.failed;
  } else if (options.length === 0) {
    status = messages.empty;
  }

  function pick(option: Option) {
    onChange(option);
    setText("");
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (!isListOpen || options.length === 0) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (Math.min(current, options.length - 1) + step + options.length) % options.length);
    } else if (event.key === "Enter" && activeOption) {
      // Enter picks the match; it must not submit the form the field is in
      event.preventDefault();
      pick(activeOption);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isListOpen}
        aria-controls={listId}
        aria-activedescendant={isListOpen && activeOption ? optionId(activeOption) : undefined}
        placeholder={placeholder}
        value={value === null ? text : getLabel(value)}
        onChange={(event) => {
          if (value !== null) {
            onChange(null);
          }
          setText(event.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        className="h-11 rounded-xl border border-line bg-surface px-3 text-sm text-foreground transition-colors hover:border-brand/50 placeholder:text-muted focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/25 focus-visible:outline-offset-0 focus-visible:outline-4"
      />
      <div
        hidden={!isListOpen}
        className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-surface shadow-card"
      >
        <ul id={listId} role="listbox" aria-label={label}>
          {options.map((option) => (
            <li
              key={getKey(option)}
              id={optionId(option)}
              role="option"
              aria-selected={option === activeOption}
              // Keeps the focus in the field, so the list is still there when the click lands
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                option === activeOption ? "bg-brand-soft text-brand" : "hover:bg-brand-soft/60",
              )}
            >
              <span className="block font-medium">{getLabel(option)}</span>
              {getDetail && <span className="block text-xs text-muted">{getDetail(option)}</span>}
            </li>
          ))}
        </ul>
        <p role="status" className={cn("px-3 py-2 text-sm text-muted", status === null && "sr-only")}>
          {status}
        </p>
      </div>
    </div>
  );
}
