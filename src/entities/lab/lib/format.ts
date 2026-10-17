/** A quantity for the reader's locale, with at most `digits` decimals and its unit; a dash when undefined. */
export function formatQuantity(locale: string, value: number, unit: string, digits = 2): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  return unit ? `${number} ${unit}` : number;
}
