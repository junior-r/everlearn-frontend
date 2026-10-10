/** Replaces `{name}` placeholders in a dictionary string. Unknown placeholders are left as they are. */
export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder);
}

/**
 * Turns a backend error code into the dictionary's text for it. Unknown codes
 * get the generic message, so a code from a URL is never echoed onto the page.
 */
export function errorMessage(
  errors: Record<string, string> & { fallback: string },
  code: string | null | undefined,
): string | null {
  if (!code) {
    return null;
  }
  return Object.hasOwn(errors, code) ? errors[code] : errors.fallback;
}
