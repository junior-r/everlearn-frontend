/** Writes whole figures the way the locale does (thousands separators included). */
export function countFormatter(locale: string): (value: number) => string {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return (value) => formatter.format(value);
}

/** Writes a percentage computed by the backend, with at most one decimal. */
export function percentFormatter(locale: string): (value: number) => string {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (value) => `${formatter.format(value)}%`;
}
