import type { ExpressionError } from "@/shared/lib/expression";
import { format } from "@/shared/i18n";

export interface ExpressionErrorTexts {
  empty: string;
  syntax: string;
  unknownName: string;
  tooLong: string;
  noEquals: string;
}

/** What is wrong with an expression, in words; `unknownName` names the culprit. */
export function describeExpressionError(
  texts: ExpressionErrorTexts,
  error: ExpressionError | { code: "noEquals" },
): string {
  return error.code === "unknownName" && "name" in error
    ? format(texts.unknownName, { name: error.name ?? "" })
    : texts[error.code];
}
